// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IVaultExecutor} from "../../src/interfaces/IVaultExecutor.sol";
import {MaliciousHeir} from "./MaliciousHeir.sol";

contract NotifyingVaultExecutor is IVaultExecutor {
    function checkOwnership(address) external pure override returns (bool) {
        return true;
    }

    function transferControl(address, address to) external override {
        // Call recipient if it supports onAssetTransferred
        (bool ok,) = to.call(abi.encodeWithSignature("onAssetTransferred()"));
        ok; // silence unused variable warning
    }
}
