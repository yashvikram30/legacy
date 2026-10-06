// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IWorldID} from "../../src/adapters/WorldIDVerifierAdapter.sol";

/// @title MockWorldID
/// @notice Always-passing IWorldID implementation for unit tests.
/// @dev Real proof verification (against actual Semaphore circuits) belongs
///      in fork tests against the deployed World ID contracts per Phase 7.1 -
///      not here. This mock exists purely so LegacyVault's state machine can
///      be tested without generating real ZK proofs in every test.
contract MockWorldID is IWorldID {
    bool public shouldRevert;
    uint256 public expectedSignalHash;

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function setExpectedSignalHash(uint256 _expectedSignalHash) external {
        expectedSignalHash = _expectedSignalHash;
    }

    function verifyProof(
        uint256, /* root */
        uint256, /* groupId */
        uint256 signalHash,
        uint256, /* nullifierHash */
        uint256, /* externalNullifierHash */
        uint256[8] calldata /* proof */
    )
        external
        view
    {
        require(!shouldRevert, "MockWorldID: forced revert");
        if (expectedSignalHash != 0) {
            require(signalHash == expectedSignalHash, "MockWorldID: invalid signal hash");
        }
    }
}
