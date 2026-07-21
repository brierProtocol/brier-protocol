// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC4626Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title BrierVault
 * @notice ERC4626-compliant vault for the Brier Protocol algorithmic trading engine.
 *
 * FIXES vs v1:
 *   [FIX-1] settleMarket verifica balance real antes de distribuir fees.
 *   [FIX-2] Per-trade capital tracking via tradeLockedCapital[tradeId].
 *   [FIX-3] Retiros instantáneos de idle capital. Sin timelock de 48h.
 *   [FIX-4] Upgradeable Minimal Proxy support (Initializable).
 *   [FIX-5] Skin-in-the-game tracking & Circuit Breaker slashing mechanism.
 *   [FIX-6] Pause bloquea deposits/trading pero NUNCA los retiros: un vault
 *           cerrado por black swan es claim-only, no una trampa para los LP.
 *   [FIX-7] settleMarket suma skinInGame al balance check (el colchón del
 *           builder no puede tapar un payout que nunca llegó).
 *   [FIX-8] triggerCircuitBreaker no exige skin > 0: pausa siempre, slashea
 *           lo que haya (el cron de deterioro debe poder frenar el vault
 *           aunque el builder nunca haya fondeado su skin).
 */
contract BrierVault is Initializable, ERC4626Upgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    address public brierDaemon;
    uint256 public idleCapital;
    uint256 public activeLockedCapital;
    uint256 public maxCapacity;
    address public polymarketCTF;
    address public builderWallet;
    uint256 public totalProfit;
    address public feeRecipient;

    // Skin in the game (Maker's stake, e.g. 5,000 USDC).
    // `skinInGame` = USDC realmente fondeado y presente en el vault.
    // `requiredSkinInGame` = objetivo mínimo configurado al desplegar.
    uint256 public skinInGame;
    uint256 public requiredSkinInGame;

    uint256 public constant DEPOSITOR_SHARE_BPS = 6000;
    uint256 public constant BUILDER_SHARE_BPS   = 3000;
    uint256 public constant PLATFORM_SHARE_BPS  = 1000;

    // Capital locked por trade individual
    mapping(bytes32 => uint256) public tradeLockedCapital;

    event TradeExecuted(bytes32 indexed tradeId, bytes32 indexed marketId, uint256 amount);
    event TradeSettled(bytes32 indexed tradeId, uint256 payout, bool profitable);
    event FeesDistributed(uint256 builderFee, uint256 platformFee, uint256 depositorProfit);
    event TradeStale(bytes32 indexed tradeId);
    event TradeWrittenOff(bytes32 indexed tradeId, uint256 amount);
    event DaemonUpdated(address indexed oldDaemon, address indexed newDaemon);
    event MaxCapacityUpdated(uint256 newCapacity);
    event CircuitBreakerTriggered(uint256 slashedAmount);
    event SkinFunded(address indexed funder, uint256 amount, uint256 totalSkin);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        IERC20 asset_,
        string memory vaultName_,
        string memory vaultSymbol_,
        address _brierDaemon,
        address _builderWallet,
        address _polymarketCTF,
        address _gnosisSafeAdmin,
        address _feeRecipient,
        uint256 _maxCapacity,
        uint256 _skinInGame
    ) initializer public {
        require(_brierDaemon   != address(0), "BrierVault: zero daemon address");
        require(_builderWallet != address(0), "BrierVault: zero builder address");
        require(_feeRecipient  != address(0), "BrierVault: zero fee recipient");
        require(_maxCapacity    > 0,          "BrierVault: zero max capacity");

        __ERC4626_init(asset_);
        __ERC20_init(vaultName_, vaultSymbol_);
        __Ownable_init(_gnosisSafeAdmin);
        __Pausable_init();
        __ReentrancyGuard_init();

        brierDaemon   = _brierDaemon;
        builderWallet = _builderWallet;
        polymarketCTF = _polymarketCTF;
        feeRecipient  = _feeRecipient;
        maxCapacity   = _maxCapacity;

        // El skin NO se cuenta hasta que se fondee de verdad (ver fundSkinInGame).
        requiredSkinInGame = _skinInGame;
        skinInGame         = 0;
    }

    /**
     * @notice El creador (Maker) deposita su skin-in-the-game real en USDC.
     * @dev Transfiere USDC al vault y lo registra como buffer de seguridad.
     *      No emite shares: el skin no es capital del LP, es un colchón que solo
     *      entra en juego (idleCapital) si se dispara el Circuit Breaker.
     */
    function fundSkinInGame(uint256 amount) external nonReentrant {
        require(amount > 0, "BrierVault: zero amount");
        IERC20(asset()).safeTransferFrom(msg.sender, address(this), amount);
        skinInGame += amount;
        emit SkinFunded(msg.sender, amount, skinInGame);
    }

    modifier onlyExecutor() {
        require(msg.sender == brierDaemon, "BrierVault: caller is not the executor");
        _;
    }

    // =========================================================
    // Trading
    // =========================================================

    function executeTrade(
        bytes32 tradeId,
        bytes32 marketId,
        uint256[] calldata outcome,
        uint256 usdcAmount
    ) external onlyExecutor whenNotPaused nonReentrant {
        require(usdcAmount > 0,                         "BrierVault: amount must be > 0");
        require(usdcAmount <= idleCapital,              "BrierVault: insufficient idle capital");
        require(tradeLockedCapital[tradeId] == 0,       "BrierVault: tradeId already active");
        require(usdcAmount <= totalAssets() * 20 / 100, "BrierVault: exceeds 20% trade limit");

        // CEI: actualizar estado antes de llamada externa
        idleCapital                  -= usdcAmount;
        activeLockedCapital          += usdcAmount;
        tradeLockedCapital[tradeId]   = usdcAmount;

        IERC20(asset()).safeIncreaseAllowance(polymarketCTF, usdcAmount);

        (bool success, ) = polymarketCTF.call(
            abi.encodeWithSignature(
                "splitPosition(address,bytes32,bytes32,uint256[],uint256)",
                asset(),
                bytes32(0),
                marketId,
                outcome,
                usdcAmount
            )
        );

        if (!success) {
            IERC20(asset()).safeDecreaseAllowance(polymarketCTF, usdcAmount);
            idleCapital                  += usdcAmount;
            activeLockedCapital          -= usdcAmount;
            tradeLockedCapital[tradeId]   = 0;
            revert("BrierVault: CTF splitPosition failed");
        }

        emit TradeExecuted(tradeId, marketId, usdcAmount);
    }

    function settleMarket(
        bytes32 tradeId,
        uint256 payout
    ) external onlyExecutor nonReentrant {
        uint256 initialInvestment = tradeLockedCapital[tradeId];
        require(initialInvestment > 0, "BrierVault: trade not found or already settled");

        // [FIX-7] El skin del builder vive en el mismo balance pero no es capital
        // del LP: sin sumarlo aquí, un payout nunca recibido pasaría el check
        // "tapado" por el skin y un retiro posterior se llevaría ese USDC.
        uint256 contractBalance = IERC20(asset()).balanceOf(address(this));
        require(
            contractBalance >= idleCapital + skinInGame + payout,
            "BrierVault: payout not received - redeem from CTF first"
        );

        tradeLockedCapital[tradeId]  = 0;
        activeLockedCapital         -= initialInvestment;

        if (payout > initialInvestment) {
            uint256 profit = payout - initialInvestment;

            uint256 builderFee      = (profit * BUILDER_SHARE_BPS)  / 10000;
            uint256 platformFee     = (profit * PLATFORM_SHARE_BPS) / 10000;
            uint256 depositorProfit = profit - builderFee - platformFee;

            totalProfit += profit;
            idleCapital += initialInvestment + depositorProfit;

            IERC20(asset()).safeTransfer(builderWallet, builderFee);
            IERC20(asset()).safeTransfer(feeRecipient,  platformFee);

            emit FeesDistributed(builderFee, platformFee, depositorProfit);
            emit TradeSettled(tradeId, payout, true);
        } else {
            idleCapital += payout;
            emit TradeSettled(tradeId, payout, false);
        }
    }

    /**
     * @notice Writes off a trade whose on-chain collateral is unrecoverable.
     * @dev On executeTrade the USDC LEAVES the vault into the CTF. If that position
     *      gets stuck or is lost, the collateral is gone from the vault. Before this
     *      fix, markTradeStale only emitted an event: tradeLockedCapital[tradeId] and
     *      activeLockedCapital stayed inflated forever, so totalAssets() over-reported
     *      and the last LPs to redeem could be left unable to withdraw.
     *
     *      The honest fix is a write-off: clear the per-trade lock and reduce
     *      activeLockedCapital, realizing the loss against totalAssets so shares are
     *      priced truthfully. We deliberately do NOT credit idleCapital — that USDC is
     *      not in the vault, so crediting idle would let idleCapital exceed the real
     *      balance and break withdrawals. The loss is socialized across shareholders,
     *      which is the correct ERC4626 behavior for a realized loss.
     *
     *      Write-off is terminal: a written-off trade can no longer be settled. If the
     *      CTF position ever does pay out, the redeemed USDC lands in the vault as a
     *      safe surplus (balance > totalAssets) that an admin recovery can later book.
     */
    function markTradeStale(bytes32 tradeId) external onlyExecutor {
        uint256 locked = tradeLockedCapital[tradeId];
        require(locked > 0, "BrierVault: trade not active");

        tradeLockedCapital[tradeId] = 0;
        activeLockedCapital -= locked;

        emit TradeStale(tradeId);
        emit TradeWrittenOff(tradeId, locked);
    }

    // =========================================================
    // Safety & Slashing Mechanism
    // =========================================================

    /**
     * @notice Triggers the Circuit Breaker, slashing the Maker's Skin-in-the-Game.
     * @dev Called exclusively by the off-chain Risk Engine (brierDaemon) when Max Drawdown > 15%.
     */
    function triggerCircuitBreaker() external onlyExecutor nonReentrant {
        // [FIX-8] No skin funded is not a reason to keep the vault trading: pause
        // always, slash whatever buffer exists (possibly zero).
        uint256 slashedAmount = skinInGame;
        skinInGame = 0;

        // Add slashed stake to idleCapital to absorb LP losses
        idleCapital += slashedAmount;

        _pause(); // Suspend further trading and deposits — redemptions stay open [FIX-6]

        emit CircuitBreakerTriggered(slashedAmount);
    }

    // =========================================================
    // ERC4626 Overrides
    // =========================================================

    function totalAssets() public view virtual override returns (uint256) {
        // Solo capital propiedad de los LP (idle + en trades).
        // El skinInGame NO se incluye: es un colchón aparte que no tiene shares y
        // por tanto no debe diluir/inflar el precio de las shares del LP. Solo pasa
        // a formar parte del capital (idleCapital) si se dispara el Circuit Breaker.
        return idleCapital + activeLockedCapital;
    }

    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        require(totalAssets() + assets <= maxCapacity, "BrierVault: max capacity reached");
        super._deposit(caller, receiver, assets, shares);
        idleCapital += assets;
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        require(assets <= idleCapital, "BrierVault: only idle capital is withdrawable");
        idleCapital -= assets;
        super._withdraw(caller, receiver, owner, assets, shares);
    }

    function deposit(uint256 assets, address receiver)
        public virtual override whenNotPaused returns (uint256)
    {
        return super.deposit(assets, receiver);
    }

    function mint(uint256 shares, address receiver)
        public virtual override whenNotPaused returns (uint256)
    {
        return super.mint(shares, receiver);
    }

    // [FIX-6] Sin whenNotPaused: la pausa (black swan / circuit breaker) corta
    // deposits y trading, pero el LP SIEMPRE puede redimir su idle capital al
    // NAV vigente. Congelar los retiros justo en el peor momento contradice el
    // diseño claim-only y convierte el freno de emergencia en una trampa.
    function withdraw(uint256 assets, address receiver, address owner)
        public virtual override nonReentrant returns (uint256)
    {
        return super.withdraw(assets, receiver, owner);
    }

    function redeem(uint256 shares, address receiver, address owner)
        public virtual override nonReentrant returns (uint256)
    {
        return super.redeem(shares, receiver, owner);
    }

    // =========================================================
    // Admin
    // =========================================================

    function setDaemon(address _newDaemon) external onlyOwner {
        require(_newDaemon != address(0), "BrierVault: zero address");
        emit DaemonUpdated(brierDaemon, _newDaemon);
        brierDaemon = _newDaemon;
    }

    function setFeeRecipient(address _newFeeRecipient) external onlyOwner {
        require(_newFeeRecipient != address(0), "BrierVault: zero address");
        feeRecipient = _newFeeRecipient;
    }

    function setMaxCapacity(uint256 _maxCapacity) external onlyOwner {
        require(_maxCapacity > 0, "BrierVault: zero capacity");
        maxCapacity = _maxCapacity;
        emit MaxCapacityUpdated(_maxCapacity);
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}
