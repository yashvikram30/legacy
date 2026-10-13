// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {LegacyVault} from "./LegacyVault.sol";
import {ILivenessVerifier} from "./interfaces/ILivenessVerifier.sol";

contract LegacyVaultFactory {
    using Clones for address;

    address public immutable implementation;

    mapping(address => address[]) private vaultsByOwner;

    // Every vault created, so apps can find vaults where an address is an heir
    // or guardian by reading state. Events can't serve this on Monad: public
    // RPCs cap eth_getLogs at a 100-block range.
    address[] private allVaults;

    event VaultCreated(address indexed owner, address indexed vault);

    error InvalidImplementation();

    constructor(address _implementation) {
        if (_implementation == address(0)) revert InvalidImplementation();
        implementation = _implementation;
    }

    function createVault(
        ILivenessVerifier verifier,
        uint256 checkInInterval,
        uint256 gracePeriod,
        uint256 contestableWindow
    ) external returns (address vault) {
        vault = implementation.clone();

        LegacyVault(vault).initialize(msg.sender, verifier, checkInInterval, gracePeriod, contestableWindow);

        vaultsByOwner[msg.sender].push(vault);
        allVaults.push(vault);

        emit VaultCreated(msg.sender, vault);
    }

    function getVaults(address account) external view returns (address[] memory) {
        return vaultsByOwner[account];
    }

    /// @notice Number of vaults this factory has created.
    function vaultCount() external view returns (uint256) {
        return allVaults.length;
    }

    /// @notice Up to `count` vaults starting at index `start`, in creation order.
    /// @dev Paged so callers stay within eth_call limits as the list grows.
    function getVaultsPage(uint256 start, uint256 count) external view returns (address[] memory page) {
        uint256 total = allVaults.length;
        if (start >= total) return new address[](0);
        uint256 end = start + count > total ? total : start + count;
        page = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            page[i - start] = allVaults[i];
        }
    }
}
