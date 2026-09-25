// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVaultExecutor} from "../interfaces/IVaultExecutor.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @title ERC721Adapter
/// @notice Non-custodial adapter for transferring ownership of an ERC-721 NFT upon succession.
contract ERC721Adapter is IVaultExecutor {
    IERC721 public immutable tokenContract;
    uint256 public immutable tokenId;
    address public immutable vault;

    error NotVault();
    error NotCurrentOwner();
    error InvalidAddress();

    event NFTOwnershipTransferred(
        address indexed tokenContract, uint256 indexed tokenId, address indexed from, address to
    );

    constructor(address _tokenContract, uint256 _tokenId, address _vault) {
        if (_tokenContract == address(0) || _vault == address(0)) {
            revert InvalidAddress();
        }

        tokenContract = IERC721(_tokenContract);
        tokenId = _tokenId;
        vault = _vault;
    }

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    function checkOwnership(address expectedOwner) external view override returns (bool) {
        try tokenContract.ownerOf(tokenId) returns (address currentOwner) {
            return currentOwner == expectedOwner;
        } catch {
            return false;
        }
    }

    function transferControl(address from, address to) external override onlyVault {
        if (tokenContract.ownerOf(tokenId) != from) {
            revert NotCurrentOwner();
        }

        tokenContract.safeTransferFrom(from, to, tokenId);

        emit NFTOwnershipTransferred(address(tokenContract), tokenId, from, to);
    }
}
