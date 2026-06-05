// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BrierVault} from "./BrierVault.sol";

/**
 * @title BrierVaultFactory
 * @notice EIP-1167 Minimal Proxy Factory to deploy Brier Vaults cheaply.
 */
contract BrierVaultFactory is Ownable {
    address public immutable vaultImplementation;

    event VaultDeployed(string botId, address vaultAddress);

    constructor(address _vaultImplementation, address _gnosisSafeAdmin) Ownable(_gnosisSafeAdmin) {
        require(_vaultImplementation != address(0), "BrierVaultFactory: implementation is zero");
        vaultImplementation = _vaultImplementation;
    }

    /**
     * @notice Deploys a new Brier Vault using a minimal proxy.
     */
    function deployVault(
        string memory botId,
        IERC20 asset,
        string memory vaultName,
        string memory vaultSymbol,
        address brierDaemon,
        address builderWallet,
        address polymarketCTF,
        address gnosisSafeAdmin,
        address feeRecipient,
        uint256 maxCapacity,
        uint256 skinInGameAmount
    ) external onlyOwner returns (address) {
        address clone = Clones.clone(vaultImplementation);
        BrierVault(clone).initialize(
            asset,
            vaultName,
            vaultSymbol,
            brierDaemon,
            builderWallet,
            polymarketCTF,
            gnosisSafeAdmin,
            feeRecipient,
            maxCapacity,
            skinInGameAmount
        );
        emit VaultDeployed(botId, clone);
        return clone;
    }
}
