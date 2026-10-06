// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVaultExecutor} from "../interfaces/IVaultExecutor.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ERC20Adapter
/// @notice Non-custodial adapter for transferring a fixed amount of ERC-20 tokens upon succession.
contract ERC20Adapter is IVaultExecutor {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint256 public immutable amount;
    address public immutable vault;

    error NotVault();
    error InsufficientBalance();
    error InsufficientAllowance();
    error InvalidAddress();
    error InvalidAmount();

    event TokenTransferred(address indexed token, address indexed from, address indexed to, uint256 amount);

    constructor(address _token, uint256 _amount, address _vault) {
        if (_token == address(0) || _vault == address(0)) {
            revert InvalidAddress();
        }
        if (_amount == 0) {
            revert InvalidAmount();
        }

        token = IERC20(_token);
        amount = _amount;
        vault = _vault;
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    function checkOwnership(address expectedOwner) external view override returns (bool) {
        return token.balanceOf(expectedOwner) >= amount && token.allowance(expectedOwner, address(this)) >= amount;
    }

    function transferControl(address from, address to) external override onlyVault {
        if (token.balanceOf(from) < amount) {
            revert InsufficientBalance();
        }
        if (token.allowance(from, address(this)) < amount) {
            revert InsufficientAllowance();
        }

        token.safeTransferFrom(from, to, amount);

        emit TokenTransferred(address(token), from, to, amount);
    }
}
