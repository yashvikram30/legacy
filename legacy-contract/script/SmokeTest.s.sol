// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {LegacyVault} from "../src/LegacyVault.sol";
import {LegacyVaultFactory} from "../src/LegacyVaultFactory.sol";
import {WorldIDVerifierAdapter} from "../src/adapters/WorldIDVerifierAdapter.sol";

contract SmokeTestScript is Script {
    uint256 constant DEFAULT_ANVIL_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    function run() external {
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", DEFAULT_ANVIL_KEY);
        address deployer = vm.addr(deployerKey);
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        address verifierAddress = vm.envAddress("VERIFIER_ADDRESS");

        console.log("--------------------------------------------------");
        console.log("Running Legacy Protocol Smoke Test");
        console.log("Deployer / Tester:", deployer);
        console.log("Factory:", factoryAddress);
        console.log("Verifier Adapter:", verifierAddress);
        console.log("--------------------------------------------------");

        LegacyVaultFactory factory = LegacyVaultFactory(factoryAddress);
        address implementation = factory.implementation();
        require(implementation != address(0), "SmokeTest: Implementation is zero");
        console.log("Factory implementation verified:", implementation);

        vm.startBroadcast(deployerKey);

        // Create a test vault clone
        address vaultAddress = factory.createVault(WorldIDVerifierAdapter(verifierAddress), 30 days, 7 days, 3 days);

        vm.stopBroadcast();

        LegacyVault vault = LegacyVault(vaultAddress);
        require(vault.owner() == deployer, "SmokeTest: Vault owner mismatch");
        require(uint256(vault.getStatus()) == uint256(LegacyVault.Status.Green), "SmokeTest: Initial status not Green");
        require(vault.checkInInterval() == 30 days, "SmokeTest: Check-in interval mismatch");

        console.log("--------------------------------------------------");
        console.log("Smoke Test SUCCESS!");
        console.log("Created Vault Clone at:", vaultAddress);
        console.log("Vault Status: GREEN");
        console.log("--------------------------------------------------");
    }
}
