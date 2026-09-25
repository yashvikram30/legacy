// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test} from "forge-std/Test.sol";
import {LegacyVault} from "../src/LegacyVault.sol";
import {LegacyVaultFactory} from "../src/LegacyVaultFactory.sol";
import {WorldIDVerifierAdapter} from "../src/adapters/WorldIDVerifierAdapter.sol";
import {MockWorldID} from "./mocks/MockWorldID.sol";
import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract LegacyVaultFactoryTest is Test {
    LegacyVault public implementation;
    LegacyVaultFactory public factory;
    WorldIDVerifierAdapter public verifier;
    MockWorldID public mockWorldId;

    address owner1 = address(0xA11CE);
    address owner2 = address(0xB0B);

    uint256 constant CHECK_IN_INTERVAL = 30 days;
    uint256 constant GRACE_PERIOD = 7 days;
    uint256 constant CONTESTABLE_WINDOW = 3 days;

    event VaultCreated(address indexed owner, address indexed vault);

    function setUp() public {
        mockWorldId = new MockWorldID();
        verifier = new WorldIDVerifierAdapter(mockWorldId, 1, 12345);

        implementation = new LegacyVault();
        factory = new LegacyVaultFactory(address(implementation));
    }

    function test_ImplementationStoredCorrectly() public view {
        assertEq(factory.implementation(), address(implementation));
    }

    function test_RevertWhen_FactoryInitializedWithZeroImplementation() public {
        vm.expectRevert(LegacyVaultFactory.InvalidImplementation.selector);
        new LegacyVaultFactory(address(0));
    }

    function test_CreateVaultCreatesContractAndInitializesCorrectly() public {
        vm.prank(owner1);
        address vaultAddr = factory.createVault(verifier, CHECK_IN_INTERVAL, GRACE_PERIOD, CONTESTABLE_WINDOW);

        assertTrue(vaultAddr != address(0));
        assertTrue(vaultAddr.code.length > 0);

        LegacyVault vault = LegacyVault(vaultAddr);
        assertEq(vault.owner(), owner1);
        assertEq(address(vault.verifier()), address(verifier));
        assertEq(vault.checkInInterval(), CHECK_IN_INTERVAL);
        assertEq(vault.gracePeriod(), GRACE_PERIOD);
        assertEq(vault.contestableWindow(), CONTESTABLE_WINDOW);
        assertEq(vault.lastCheckIn(), block.timestamp);
        assertEq(uint256(vault.getStatus()), uint256(LegacyVault.Status.Green));
    }

    function test_VaultCreatedEventEmitted() public {
        vm.prank(owner1);
        vm.expectEmit(true, false, false, false);
        emit VaultCreated(owner1, address(0));
        factory.createVault(verifier, CHECK_IN_INTERVAL, GRACE_PERIOD, CONTESTABLE_WINDOW);
    }

    function test_VaultAppearsInGetVaults() public {
        vm.prank(owner1);
        address vault1 = factory.createVault(verifier, CHECK_IN_INTERVAL, GRACE_PERIOD, CONTESTABLE_WINDOW);

        address[] memory vaults = factory.getVaults(owner1);
        assertEq(vaults.length, 1);
        assertEq(vaults[0], vault1);
    }

    function test_TwoOwnersReceiveIndependentVaults() public {
        vm.prank(owner1);
        address vault1 = factory.createVault(verifier, CHECK_IN_INTERVAL, GRACE_PERIOD, CONTESTABLE_WINDOW);

        vm.prank(owner2);
        address vault2 = factory.createVault(verifier, 60 days, 14 days, 5 days);

        assertTrue(vault1 != vault2);

        assertEq(LegacyVault(vault1).owner(), owner1);
        assertEq(LegacyVault(vault2).owner(), owner2);

        assertEq(LegacyVault(vault1).checkInInterval(), CHECK_IN_INTERVAL);
        assertEq(LegacyVault(vault2).checkInInterval(), 60 days);

        address[] memory vaults1 = factory.getVaults(owner1);
        address[] memory vaults2 = factory.getVaults(owner2);

        assertEq(vaults1.length, 1);
        assertEq(vaults1[0], vault1);

        assertEq(vaults2.length, 1);
        assertEq(vaults2[0], vault2);
    }

    function test_SameOwnerCanCreateMultipleVaults() public {
        vm.startPrank(owner1);
        address vaultA = factory.createVault(verifier, CHECK_IN_INTERVAL, GRACE_PERIOD, CONTESTABLE_WINDOW);
        address vaultB = factory.createVault(verifier, 60 days, 14 days, 5 days);
        vm.stopPrank();

        assertTrue(vaultA != vaultB);

        address[] memory vaults = factory.getVaults(owner1);
        assertEq(vaults.length, 2);
        assertEq(vaults[0], vaultA);
        assertEq(vaults[1], vaultB);
    }

    function test_CloneCannotBeInitializedTwice() public {
        vm.prank(owner1);
        address vaultAddr = factory.createVault(verifier, CHECK_IN_INTERVAL, GRACE_PERIOD, CONTESTABLE_WINDOW);

        LegacyVault vault = LegacyVault(vaultAddr);

        vm.prank(owner1);
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        vault.initialize(owner1, verifier, CHECK_IN_INTERVAL, GRACE_PERIOD, CONTESTABLE_WINDOW);
    }

    function test_ImplementationCannotBeInitializedDirectly() public {
        vm.prank(owner1);
        vm.expectRevert(Initializable.InvalidInitialization.selector);
        implementation.initialize(owner1, verifier, CHECK_IN_INTERVAL, GRACE_PERIOD, CONTESTABLE_WINDOW);
    }

    function test_ClonedVaultStatesAreIndependent() public {
        vm.prank(owner1);
        address vault1Addr = factory.createVault(verifier, CHECK_IN_INTERVAL, GRACE_PERIOD, CONTESTABLE_WINDOW);

        vm.prank(owner2);
        address vault2Addr = factory.createVault(verifier, CHECK_IN_INTERVAL, GRACE_PERIOD, CONTESTABLE_WINDOW);

        LegacyVault vault1 = LegacyVault(vault1Addr);
        LegacyVault vault2 = LegacyVault(vault2Addr);

        address heirA = address(0x1111);
        address heirB = address(0x2222);

        vm.prank(owner1);
        vault1.addHeir(heirA);

        vm.prank(owner2);
        vault2.addHeir(heirB);

        assertTrue(vault1.isHeir(heirA));
        assertFalse(vault1.isHeir(heirB));

        assertTrue(vault2.isHeir(heirB));
        assertFalse(vault2.isHeir(heirA));

        vm.prank(owner1);
        vault1.updateParameters(90 days, 21 days, 10 days);

        assertEq(vault1.checkInInterval(), 90 days);
        assertEq(vault2.checkInInterval(), CHECK_IN_INTERVAL);
    }
}
