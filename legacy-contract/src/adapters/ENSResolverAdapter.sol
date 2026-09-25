// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IVaultExecutor} from "../interfaces/IVaultExecutor.sol";

interface IENSRegistry {
    function owner(bytes32 node) external view returns (address);
    function setOwner(bytes32 node, address owner) external;
}

/// @title ENSResolverAdapter
/// @notice Non-custodial adapter for transferring ownership of an unwrapped ENS domain.
contract ENSResolverAdapter is IVaultExecutor {
    IENSRegistry public immutable registry;
    bytes32 public immutable node;
    address public immutable vault;

    error NotVault();
    error NotCurrentOwner();
    error InvalidAddress();
    error InvalidNode();

    event ENSOwnershipTransferred(bytes32 indexed node, address indexed from, address indexed to);

    constructor(address _registry, bytes32 _node, address _vault) {
        if (_registry == address(0) || _vault == address(0)) revert InvalidAddress();
        if (_node == bytes32(0)) revert InvalidNode();

        registry = IENSRegistry(_registry);
        node = _node;
        vault = _vault;
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    function checkOwnership(address expectedOwner) external view override returns (bool) {
        return registry.owner(node) == expectedOwner;
    }

    function transferControl(address from, address to) external override onlyVault {
        if (registry.owner(node) != from) {
            revert NotCurrentOwner();
        }

        registry.setOwner(node, to);

        emit ENSOwnershipTransferred(node, from, to);
    }
}
