// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {LegacyVault} from "../src/LegacyVault.sol";
import {LegacyVaultFactory} from "../src/LegacyVaultFactory.sol";
import {PasskeyVerifierAdapter} from "../src/adapters/PasskeyVerifierAdapter.sol";
import {LegacyPolicyEngine} from "../src/LegacyPolicyEngine.sol";

/// @notice Deploys Legacy with passkey liveness, for Monad.
/// @dev Vaults created through this factory verify check-ins as WebAuthn
///      assertions against Monad's P-256 precompile at 0x100 (EIP-7951).
///
///        PRIVATE_KEY=0x... forge script script/DeployMonad.s.sol --rpc-url monad_testnet --broadcast
///        PRIVATE_KEY=0x... forge script script/DeployMonad.s.sol --rpc-url monad --broadcast
///
///      Transaction hashes are recorded in broadcast/DeployMonad.s.sol/<chainId>/run-latest.json.
contract DeployMonadScript is Script {
    // Default Anvil Account 0 private key
    uint256 constant DEFAULT_ANVIL_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

    struct Deployment {
        address verifierAdapter;
        address implementation;
        address factory;
        address policyEngine;
    }

    function run() external returns (Deployment memory deployment) {
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", DEFAULT_ANVIL_KEY);
        address deployer = vm.addr(deployerKey);

        console.log("--------------------------------------------------");
        console.log("Deploying Legacy Protocol (passkey liveness)");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        console.log("--------------------------------------------------");

        vm.startBroadcast(deployerKey);

        // 1. Passkey verifier, shared by every vault
        PasskeyVerifierAdapter verifier = new PasskeyVerifierAdapter();
        console.log("PasskeyVerifierAdapter deployed at:", address(verifier));

        // 2. LegacyVault Logic Implementation
        LegacyVault implementation = new LegacyVault();
        console.log("LegacyVault Implementation deployed at:", address(implementation));

        // 3. LegacyVaultFactory
        LegacyVaultFactory factory = new LegacyVaultFactory(address(implementation));
        console.log("LegacyVaultFactory deployed at:", address(factory));

        // 4. LegacyPolicyEngine
        LegacyPolicyEngine policyEngine = new LegacyPolicyEngine();
        console.log("LegacyPolicyEngine deployed at:", address(policyEngine));

        vm.stopBroadcast();

        deployment = Deployment({
            verifierAdapter: address(verifier),
            implementation: address(implementation),
            factory: address(factory),
            policyEngine: address(policyEngine)
        });

        console.log("--------------------------------------------------");
        console.log("Deployment complete! Paste into legacy-frontend/.env.local:");
        console.log("--------------------------------------------------");
        console.log(block.chainid == 143 ? "NEXT_PUBLIC_CHAIN=monad" : "NEXT_PUBLIC_CHAIN=monad-testnet");
        console.log(string.concat("NEXT_PUBLIC_FACTORY_ADDRESS=", vm.toString(address(factory))));
        console.log(string.concat("NEXT_PUBLIC_VERIFIER_ADDRESS=", vm.toString(address(verifier))));
        console.log(string.concat("NEXT_PUBLIC_IMPLEMENTATION_ADDRESS=", vm.toString(address(implementation))));
        console.log(string.concat("NEXT_PUBLIC_POLICY_ENGINE_ADDRESS=", vm.toString(address(policyEngine))));
        console.log("--------------------------------------------------");
    }
}
