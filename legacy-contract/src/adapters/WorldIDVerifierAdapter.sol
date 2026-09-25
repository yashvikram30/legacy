// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IWorldID {
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}

/// @title WorldIDVerifierAdapter
/// @notice Wraps World ID 3.0 proof verification and nullifier replay protection
///         for a single LegacyVault's recurring liveness "heartbeat" check-ins.
/// @dev Testnet verification uses MockWorldID, matching Worldcoin's own World Chain Template App
///      testing pattern (Simulator proofs + standalone verifier). Production path uses the same
///      adapter code pointed at the live WorldIDRouter with no code changes required.
contract WorldIDVerifierAdapter {
    IWorldID public immutable worldId;
    uint256 public immutable groupId; // 1 = orb-verified
    uint256 public immutable externalNullifierHash; // derived from app ID + action ID

    mapping(address vault => uint256 registeredNullifierHash) public vaultNullifier;

    error NullifierNotRegistered();
    error NullifierMismatch();
    error AlreadyRegistered();

    constructor(IWorldID _worldId, uint256 _groupId, uint256 _externalNullifierHash) {
        worldId = _worldId;
        groupId = _groupId;
        externalNullifierHash = _externalNullifierHash;
    }

    function registerNullifier(
        address vault,
        address signalAddress,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        if (vaultNullifier[vault] != 0) revert AlreadyRegistered();

        worldId.verifyProof(
            root, groupId, _hashSignal(vault, signalAddress), nullifierHash, externalNullifierHash, proof
        );

        vaultNullifier[vault] = nullifierHash;
    }

    function verifyCheckIn(
        address vault,
        address signalAddress,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external view {
        uint256 registered = vaultNullifier[vault];
        if (registered == 0) revert NullifierNotRegistered();
        if (nullifierHash != registered) revert NullifierMismatch();

        worldId.verifyProof(
            root, groupId, _hashSignal(vault, signalAddress), nullifierHash, externalNullifierHash, proof
        );
    }

    function hashSignal(address vault, address signalAddress) external pure returns (uint256) {
        return _hashSignal(vault, signalAddress);
    }

    function _hashSignal(address vault, address signalAddress) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(vault, signalAddress))) >> 8;
    }
}
