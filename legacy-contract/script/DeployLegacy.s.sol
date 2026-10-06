// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {LegacyVault} from "../src/LegacyVault.sol";
import {LegacyVaultFactory} from "../src/LegacyVaultFactory.sol";
import {WorldIDVerifierAdapter, IWorldID} from "../src/adapters/WorldIDVerifierAdapter.sol";
import {MockWorldID} from "../test/mocks/MockWorldID.sol";

import {ByteHasher} from "../src/libraries/ByteHasher.sol";

contract DeployLegacyScript is Script {
    // Default Anvil Account 0 private key
    uint256 constant DEFAULT_ANVIL_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    struct Deployment {
        address worldId;
        address verifierAdapter;
        address implementation;
        address factory;
    }

    function run() external returns (Deployment memory deployment) {
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", DEFAULT_ANVIL_KEY);
        address deployer = vm.addr(deployerKey);

        console.log("--------------------------------------------------");
        console.log("Deploying Legacy Protocol");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("--------------------------------------------------");

        // World ID Configuration
        address worldIdRouter = vm.envOr("WORLD_ID_ROUTER", address(0));
        uint256 groupId = vm.envOr("WORLD_ID_GROUP_ID", uint256(1)); // 1 = Orb-verified
        string memory appId = vm.envOr("WORLD_ID_APP_ID", string("app_staging_legacy_vault"));
        string memory action = vm.envOr("WORLD_ID_ACTION", string("heartbeat"));
        uint256 externalNullifierHash =
            vm.envOr("WORLD_ID_EXTERNAL_NULLIFIER", ByteHasher.calculateExternalNullifier(appId, action));
        console.log("World ID App ID:", appId);
        console.log("World ID Action:", action);
        console.log("Calculated externalNullifierHash:", externalNullifierHash);

        vm.startBroadcast(deployerKey);

        // 1. World ID / Verifier Adapter
        if (worldIdRouter == address(0)) {
            console.log("No WORLD_ID_ROUTER provided. Deploying MockWorldID for local testing...");
            MockWorldID mockWorldId = new MockWorldID();
            worldIdRouter = address(mockWorldId);
        }

        WorldIDVerifierAdapter verifier =
            new WorldIDVerifierAdapter(IWorldID(worldIdRouter), groupId, externalNullifierHash);
        console.log("WorldIDVerifierAdapter deployed at:", address(verifier));

        // 2. LegacyVault Logic Implementation
        LegacyVault implementation = new LegacyVault();
        console.log("LegacyVault Implementation deployed at:", address(implementation));

        // 3. LegacyVaultFactory
        LegacyVaultFactory factory = new LegacyVaultFactory(address(implementation));
        console.log("LegacyVaultFactory deployed at:", address(factory));

        vm.stopBroadcast();

        deployment = Deployment({
            worldId: worldIdRouter,
            verifierAdapter: address(verifier),
            implementation: address(implementation),
            factory: address(factory)
        });

        console.log("--------------------------------------------------");
        console.log("Deployment complete!");
        console.log("--------------------------------------------------");
    }
}
