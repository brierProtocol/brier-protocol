// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BrierCommitmentAnchor
 * @notice Immutable on-chain registry of prediction commitment Merkle roots.
 *
 * Every hour (or as configured), the Brier Protocol server computes a Merkle tree
 * of all new prediction commitHashes and publishes the root here. This creates a
 * tamper-proof chain of evidence:
 *
 *   1. Bot commits prediction → server computes SHA-256 hash → stores in DB
 *   2. Cron batches hashes → builds Merkle tree → calls anchor() on this contract
 *   3. Anyone can verify: recompute hash from prediction data, verify Merkle proof
 *      against the on-chain root, and check block.timestamp < market resolution time
 *
 * The contract is intentionally minimal (< 100 lines). No upgradability, no admin
 * overrides on published roots. Once anchored, a root is permanent.
 *
 * Gas cost: ~45k gas per anchor (one storage write + one event).
 * At 30 gwei on Polygon: ~$0.001 per batch. Negligible.
 */
contract BrierCommitmentAnchor is Ownable {

    struct Anchor {
        bytes32 merkleRoot;
        uint256 leafCount;
        uint256 timestamp;
    }

    // Append-only log of all anchored roots
    Anchor[] public anchors;

    // Quick lookup: merkleRoot → index in anchors[]
    mapping(bytes32 => uint256) public rootIndex;

    // Quick existence check
    mapping(bytes32 => bool) public rootExists;

    event Anchored(bytes32 indexed merkleRoot, uint256 leafCount, uint256 timestamp);

    constructor(address _admin) Ownable(_admin) {}

    /**
     * @notice Publish a Merkle root of prediction commitments.
     * @param merkleRoot The root hash of the Merkle tree built from prediction commitHashes.
     * @param leafCount  Number of predictions included in this batch.
     *
     * Reverts if:
     *   - merkleRoot is zero (empty batch)
     *   - merkleRoot was already anchored (no overwrites)
     */
    function anchor(bytes32 merkleRoot, uint256 leafCount) external onlyOwner {
        require(merkleRoot != bytes32(0), "BrierAnchor: empty root");
        require(!rootExists[merkleRoot], "BrierAnchor: already anchored");
        require(leafCount > 0, "BrierAnchor: zero leaves");

        rootIndex[merkleRoot] = anchors.length;
        rootExists[merkleRoot] = true;
        anchors.push(Anchor({
            merkleRoot: merkleRoot,
            leafCount: leafCount,
            timestamp: block.timestamp
        }));

        emit Anchored(merkleRoot, leafCount, block.timestamp);
    }

    /**
     * @notice Returns the total number of anchored batches.
     */
    function totalAnchors() external view returns (uint256) {
        return anchors.length;
    }

    /**
     * @notice Returns anchor details by index.
     */
    function getAnchor(uint256 index) external view returns (bytes32, uint256, uint256) {
        require(index < anchors.length, "BrierAnchor: out of range");
        Anchor memory a = anchors[index];
        return (a.merkleRoot, a.leafCount, a.timestamp);
    }

    /**
     * @notice Verify that a specific Merkle root was anchored before a given timestamp.
     * @dev    Useful for automated auditors to prove prediction existed before resolution.
     */
    function wasAnchoredBefore(bytes32 merkleRoot, uint256 deadline) external view returns (bool) {
        if (!rootExists[merkleRoot]) return false;
        return anchors[rootIndex[merkleRoot]].timestamp <= deadline;
    }
}
