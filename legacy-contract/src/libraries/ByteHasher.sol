// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ByteHasher
/// @notice Canonical helper library to hash bytes into a uint256 field element
///         compatible with Semaphore and World ID 3.0.
library ByteHasher {
    /// @dev Hashes arbitrary bytes to a field element by right-shifting keccak256 by 8 bits.
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(value)) >> 8;
    }

    /// @dev Computes the canonical World ID externalNullifierHash from appId and actionId.
    ///      Formula: hashToField(abi.encodePacked(hashToField(bytes(appId)), actionId))
    function calculateExternalNullifier(string memory appId, string memory actionId) internal pure returns (uint256) {
        uint256 appIdHash = hashToField(bytes(appId));
        return hashToField(abi.encodePacked(appIdHash, actionId));
    }
}
