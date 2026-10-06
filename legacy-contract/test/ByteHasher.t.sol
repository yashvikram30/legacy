// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {ByteHasher} from "../src/libraries/ByteHasher.sol";

contract ByteHasherTest is Test {
    function test_ComputeCanonicalExternalNullifier() public pure {
        string memory appId = "app_staging_12345678";
        string memory action = "heartbeat";

        uint256 expectedAppHash = uint256(keccak256(bytes(appId))) >> 8;
        uint256 expectedExtNullifier = uint256(keccak256(abi.encodePacked(expectedAppHash, action))) >> 8;

        uint256 actual = ByteHasher.calculateExternalNullifier(appId, action);
        assertEq(actual, expectedExtNullifier);
    }

    function test_ComputeForUserApp() public view {
        string memory appId = "app_8c8440b6596bec8ea5f3a3187ce7a0c5";
        string memory action = "heartbeat";
        uint256 extNullifier = ByteHasher.calculateExternalNullifier(appId, action);
        console.log("--------------------------------------------------");
        console.log("App ID:", appId);
        console.log("Action:", action);
        console.log("External Nullifier Hash (dec):", extNullifier);
        console.logBytes32(bytes32(extNullifier));
        console.log("--------------------------------------------------");
    }
}
