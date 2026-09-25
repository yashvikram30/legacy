// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IENSRegistry} from "../../src/adapters/ENSResolverAdapter.sol";

contract MockENSRegistry is IENSRegistry {
    mapping(bytes32 => address) public owners;

    function owner(bytes32 node) external view override returns (address) {
        return owners[node];
    }

    function setOwner(bytes32 node, address newOwner) external override {
        owners[node] = newOwner;
    }
}
