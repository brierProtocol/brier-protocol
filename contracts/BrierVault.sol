// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BrierVault
 * @notice ERC4626-compliant vault for the Brier Protocol algorithmic trading engine.
 *
 * FIXES vs v1:
 *   [FIX-1] settleMarket verifica balance real antes de distribuir fees.
 *   [FIX-2] Per-trade capital tracking via tradeLockedCapital[tradeId].
 *   [FIX-3] Retiros instantáneos de idle capital. Sin timelock de 48h.
 */
contract BrierVault is ERC4626, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public brierDaemon;
    uint256 public idleCapital;
    uint256 public activeLockedCapital;
    uint256 public maxCapacity;
    address public polymarketCTF;
    address public builderWallet;
    uint256 public totalProfit;
    address public feeRecipient;

    uint256 public constant DEPOSITOR_SHARE_BPS = 6000;
    uint256 public constant BUILDER_SHARE_BPS   = 3000;
    uint256 public constant PLATFORM_SHARE_BPS  = 1000;

    // [FIX-2] Capital locked por trade individual
    mapping(bytes32 => uint256) public tradeLockedCapital;

    event TradeExecuted(bytes32 indexed tradeId, bytes32 indexed marketId, uint256 amount);
    event TradeSettled(bytes32 indexed tradeId, uint256 payout, bool profitable);
    event FeesDistributed(uint256 builderFee, uint256 platformFee, uint256 depositorProfit);
    event TradeStale(bytes32 indexed tradeId);
    event DaemonUpdated(address indexed oldDaemon, address indexed newDaemon);
    event MaxCapacityUpdated(uint256 newCapacity);

    constructor(
        IERC20 asset_,
        string memory vaultName_,
        string memory vaultSymbol_,
        address _brierDaemon,
        address _builderWallet,
        address _polymarketCTF,
        address _gnosisSafeAdmin,
        address _feeRecipient,
        uint256 _maxCapacity
    ) ERC4626(asset_) ERC20(vaultName_, vaultSymbol_) Ownable(_gnosisSafeAdmin) {
        require(_brierDaemon   != address(0), "BrierVault: zero daemon address");
        require(_builderWallet != address(0), "BrierVault: zero builder address");
        require(_feeRecipient  != address(0), "BrierVault: zero fee recipient");
        require(_maxCapacity    > 0,          "BrierVault: zero max capacity");

        brierDaemon   = _brierDaemon;
        builderWallet = _builderWallet;
        polymarketCTF = _polymarketCTF;
        feeRecipient  = _feeRecipient;
        maxCapacity   = _maxCapacity;
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

    /**
     * @notice Liquida un trade resuelto y distribuye PnL.
     * @dev El daemon debe redimir los tokens de Polymarket CTF ANTES de llamar
     *      esta función. El [FIX-1] verifica que el payout llegó físicamente.
     *
     * Ganancia: 60% queda en pool (valoriza shares), 30% → builderWallet, 10% → feeRecipient.
     * Pérdida:  idleCapital aumenta solo por el payout recibido (pérdida absorbida por el pool).
     */
    function settleMarket(
        bytes32 tradeId,
        uint256 payout
    ) external onlyExecutor nonReentrant {
        // [FIX-2] Obtener el capital exacto del trade — no se acepta como parámetro externo
        uint256 initialInvestment = tradeLockedCapital[tradeId];
        require(initialInvestment > 0, "BrierVault: trade not found or already settled");

        // [FIX-1] Verificar que los tokens del payout están físicamente en el contrato.
        // Después de redimir en Polymarket: balance real = idleCapital + payout
        uint256 contractBalance = IERC20(asset()).balanceOf(address(this));
        require(
            contractBalance >= idleCapital + payout,
            "BrierVault: payout not received - redeem from CTF first"
        );

        // CEI: limpiar estado antes de transferencias
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
            // Pérdida o break-even: solo recupera el payout
            idleCapital += payout;
            emit TradeSettled(tradeId, payout, false);
        }
    }

    function markTradeStale(bytes32 tradeId) external onlyExecutor {
        require(tradeLockedCapital[tradeId] > 0, "BrierVault: trade not active");
        emit TradeStale(tradeId);
    }

    // =========================================================
    // ERC4626 Overrides
    // =========================================================

    /**
     * @notice Total AUM = idle + locked.
     * @dev El precio de share no cambia mientras un trade está activo,
     *      solo cuando se liquida (el PnL materializa).
     */
    function totalAssets() public view virtual override returns (uint256) {
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

    /**
     * @dev [FIX-3] Solo idle capital es retirable. CEI: decrementar antes del transfer.
     */
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

    // [FIX-3] Sin timelock — retiro instantáneo contra idle capital
    function withdraw(uint256 assets, address receiver, address owner)
        public virtual override whenNotPaused nonReentrant returns (uint256)
    {
        return super.withdraw(assets, receiver, owner);
    }

    // [FIX-3] Sin timelock — redención instantánea contra idle capital
    function redeem(uint256 shares, address receiver, address owner)
        public virtual override whenNotPaused nonReentrant returns (uint256)
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
