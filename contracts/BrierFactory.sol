// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BrierVault} from "./BrierVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BrierFactory
 * @notice Factory contract to deploy new BrierVaults automatically when a bot passes incubation.
 */
contract BrierFactory is Ownable {
    
    // The underlying asset for all vaults (USDC)
    IERC20 public immutable usdcToken;
    
    // Global protocol addresses
    address public brierDaemon;
    address public polymarketCTF;
    
    // Array to keep track of all deployed vaults
    address[] public allVaults;
    
    // Mapping to quickly check if an address is a legitimate Brier Vault
    mapping(address => bool) public isBrierVault;

    // Events
    event VaultDeployed(address indexed vaultAddress, address indexed builderWallet, string botId);

    constructor(address _usdcToken, address _brierDaemon, address _polymarketCTF) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
        brierDaemon = _brierDaemon;
        polymarketCTF = _polymarketCTF;
    }

    /**
     * @notice Deploys a new BrierVault. 
     * @dev Only the protocol admin (or an automated Brier registry) can deploy vaults
     * to ensure only bots with a Brier Score < 0.25 receive a vault.
     * @param builderWallet The registered wallet of the bot builder
     * @param botId The string identifier of the bot (e.g., "alpha-strike")
     * @param vaultName The ERC20 name for the vault token
     * @param vaultSymbol The ERC20 symbol for the vault token
     */
    function deployVault(
        address builderWallet,
        string calldata botId,
        string calldata vaultName,
        string calldata vaultSymbol
    ) external onlyOwner returns (address) {
        
        BrierVault newVault = new BrierVault(
            usdcToken,
            vaultName,
            vaultSymbol,
            brierDaemon,
            builderWallet,
            polymarketCTF,
            owner(),
            1000 // Default 10% performance fee in bps
        );

        address vaultAddress = address(newVault);
        allVaults.push(vaultAddress);
        isBrierVault[vaultAddress] = true;

        emit VaultDeployed(vaultAddress, builderWallet, botId);
        
        return vaultAddress;
    }

    /**
     * @notice Returns the total number of deployed vaults
     */
    function getVaultsCount() external view returns (uint256) {
        return allVaults.length;
    }
    
    /**
     * @notice Admin function to update the daemon address for future vaults
     */
    function setDaemon(address _newDaemon) external onlyOwner {
        brierDaemon = _newDaemon;
    }
}
