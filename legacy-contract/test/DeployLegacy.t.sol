// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DeployLegacyScript} from "../script/DeployLegacy.s.sol";
import {LegacyVault} from "../src/LegacyVault.sol";
import {LegacyVaultFactory} from "../src/LegacyVaultFactory.sol";
import {WorldIDVerifierAdapter} from "../src/adapters/WorldIDVerifierAdapter.sol";

contract DeployLegacyTest is Test {
    DeployLegacyScript public script;

    function setUp() public {
        script = new DeployLegacyScript();
    }

    function test_DeploymentScriptDeploysAndInitializesCorrectly() public {
        DeployLegacyScript.Deployment memory deployment = script.run();

        // 1. Implementation address exists and has code
        assertTrue(deployment.implementation != address(0));
        assertTrue(deployment.implementation.code.length > 0);

        // 2. Factory address exists and has code
        assertTrue(deployment.factory != address(0));
        assertTrue(deployment.factory.code.length > 0);

        // 3. Verifier adapter address exists and has code
        assertTrue(deployment.verifierAdapter != address(0));
        assertTrue(deployment.verifierAdapter.code.length > 0);

        // 4. factory.implementation() == implementation
        LegacyVaultFactory factory = LegacyVaultFactory(deployment.factory);
        assertEq(factory.implementation(), deployment.implementation);

        // 5. factory.createVault() succeeds
        address owner = address(0xA11CE);
        WorldIDVerifierAdapter verifier = WorldIDVerifierAdapter(deployment.verifierAdapter);

        vm.prank(owner);
        address vaultClone = factory.createVault(verifier, 30 days, 7 days, 3 days);

        assertTrue(vaultClone != address(0));
        assertTrue(vaultClone.code.length > 0);

        LegacyVault vault = LegacyVault(vaultClone);

        // 6. clone has correct owner
        assertEq(vault.owner(), owner);

        // 7. clone has correct verifier
        assertEq(address(vault.verifier()), address(verifier));

        // 8. clone starts Green
        assertEq(uint256(vault.getStatus()), uint256(LegacyVault.Status.Green));
    }
}
