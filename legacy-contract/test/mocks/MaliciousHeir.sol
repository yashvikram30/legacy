// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {LegacyVault} from "../../src/LegacyVault.sol";

contract MaliciousHeir {
    LegacyVault public vault;
    bytes32 public targetAssetId;
    bool public shouldReenterExecute;
    bool public shouldReenterFinalize;
    bool public reenterAttempted;
    bool public reenterSucceeded;
    bytes public revertReason;

    constructor(LegacyVault _vault) {
        vault = _vault;
    }

    function setConfig(bytes32 _assetId, bool _reenterExecute, bool _reenterFinalize) external {
        targetAssetId = _assetId;
        shouldReenterExecute = _reenterExecute;
        shouldReenterFinalize = _reenterFinalize;
        reenterAttempted = false;
        reenterSucceeded = false;
        revertReason = "";
    }

    function initiateClaim() external {
        vault.initiateClaim();
    }

    function finalizeClaim() external {
        vault.finalizeClaim();
    }

    function executeClaim(bytes32 assetId) external {
        vault.executeClaim(assetId);
    }

    // Called by an executor when transferring asset to this heir
    function onAssetTransferred() external {
        if (shouldReenterExecute) {
            reenterAttempted = true;
            try vault.executeClaim(targetAssetId) {
                reenterSucceeded = true;
            } catch (bytes memory reason) {
                revertReason = reason;
            }
        }

        if (shouldReenterFinalize) {
            reenterAttempted = true;
            try vault.finalizeClaim() {
                reenterSucceeded = true;
            } catch (bytes memory reason) {
                revertReason = reason;
            }
        }
    }
}
