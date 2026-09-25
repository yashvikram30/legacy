// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IVaultExecutor
/// @notice Generalized permission-gate interface for asset-type-specific adapters.
/// @dev A LegacyVault never holds assets directly (strict non-custodial trust model,
///      decided 2026-09-11). Instead, each supported asset type (ERC-20, ERC-721,
///      cross-chain refs, etc.) implements this interface so the vault's state machine
///      can gate *control transfer* without knowing the underlying asset mechanics.
interface IVaultExecutor {
    /// @notice Returns true if `owner` currently holds/controls the asset(s)
    ///         this executor is responsible for.
    function checkOwnership(address owner) external view returns (bool);

    /// @notice Transfers control of the underlying asset(s) from `from` to `to`.
    /// @dev MUST be called only by the LegacyVault contract that governs this
    ///      executor, gated on vault state (Red + heir's claim finalized).
    function transferControl(address from, address to) external;
}
