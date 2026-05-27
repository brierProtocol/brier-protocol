// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockCTF {
    event PositionSplit(
        address indexed collateralToken,
        bytes32 parentCollectionId,
        bytes32 indexed conditionId,
        uint256[] partition,
        uint256 amount
    );

    function splitPosition(
        address collateralToken,
        bytes32 parentCollectionId,
        bytes32 conditionId,
        uint256[] calldata partition,
        uint256 amount
    ) external {
        // Transfer USDC from BrierVault to CTF to simulate actual lockup
        IERC20(collateralToken).transferFrom(msg.sender, address(this), amount);
        emit PositionSplit(collateralToken, parentCollectionId, conditionId, partition, amount);
    }
}
