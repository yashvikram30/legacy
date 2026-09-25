// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {LegacyVault} from "../src/LegacyVault.sol";
import {LegacyVaultFactory} from "../src/LegacyVaultFactory.sol";
import {WorldIDVerifierAdapter} from "../src/adapters/WorldIDVerifierAdapter.sol";

contract DeployRapidDemoScript is Script {
    uint256 constant DEFAULT_ANVIL_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    function run() external {
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", DEFAULT_ANVIL_KEY);
        address deployer = vm.addr(deployerKey);
        address verifierAddress = vm.envOr("VERIFIER_ADDRESS", address(0xBc53B9FA28bbda198aaA93f8a7cc3ef949a5A4d5));

        console.log("==================================================");
        console.log("Deploying Rapid Demo Legacy Protocol (10s Claim)");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("Verifier Adapter:", verifierAddress);
        console.log("==================================================");

        vm.startBroadcast(deployerKey);

        // 1. Deploy LegacyVault Implementation with updated floors
        LegacyVault implementation = new LegacyVault();
        console.log("New LegacyVault Implementation:", address(implementation));

        // 2. Deploy LegacyVaultFactory
        LegacyVaultFactory factory = new LegacyVaultFactory(address(implementation));
        console.log("New LegacyVaultFactory:", address(factory));

        // 3. Deploy a Rapid Demo Vault Clone
        // Parameters:
        // checkInInterval = 10 seconds (Green for 10s)
        // gracePeriod     = 5 seconds  (Amber for 5s, turns Red at 15s)
        // contestableWindow = 10 seconds (Heir contestable window is 10s)
        address demoVault = factory.createVault(
            WorldIDVerifierAdapter(verifierAddress),
            10, // 10 seconds check-in interval
            5,  // 5 seconds grace period
            10  // 10 seconds contestable window
        );
        console.log("New Rapid Demo Vault Clone:", demoVault);

        vm.stopBroadcast();

        console.log("==================================================");
        console.log("Deployment SUCCESSFUL!");
        console.log("NEXT_PUBLIC_IMPLEMENTATION_ADDRESS=", address(implementation));
        console.log("NEXT_PUBLIC_FACTORY_ADDRESS=", address(factory));
        console.log("NEXT_PUBLIC_SMOKE_VAULT_ADDRESS=", demoVault);
        console.log("==================================================");
    }
}
