// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IVaultExecutor} from "../../src/interfaces/IVaultExecutor.sol";

contract MockVaultExecutor is IVaultExecutor {
    address public lastFrom;
    address public lastTo;
    uint256 public callCount;
    bool public shouldRevert;

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function checkOwnership(address) external pure override returns (bool) {
        return true;
    }

    function transferControl(address from, address to) external override {
        if (shouldRevert) {
            revert("MockVaultExecutor: transfer failed");
        }
        lastFrom = from;
        lastTo = to;
        callCount++;
    }
}
