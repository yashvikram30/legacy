// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {WorldIDVerifierAdapter} from "./adapters/WorldIDVerifierAdapter.sol";
import {IVaultExecutor} from "./interfaces/IVaultExecutor.sol";

contract LegacyVault is Initializable, ReentrancyGuardTransient {
    enum Status {
        Green,
        Amber,
        Red
    }

    enum ClaimStatus {
        NotInitiated,
        Contestable,
        Claimed
    }

    struct Allocation {
        address heir;
        IVaultExecutor executor;
        bytes32 assetId;
        bool exists;
        bool executed;
    }

    address public owner;
    WorldIDVerifierAdapter public verifier;
    bool public livenessRegistered;

    uint256 public lastCheckIn;
    uint256 public checkInInterval;
    uint256 public gracePeriod;
    uint256 public contestableWindow;

    uint256 public constant MIN_CHECK_IN_INTERVAL = 5;
    uint256 public constant MIN_CONTESTABLE_WINDOW = 5;

    // -------------------------------------------------------------------------
    // Heirs
    // -------------------------------------------------------------------------

    mapping(address heir => bool) public isHeir;
    address[] private heirs;

    // -------------------------------------------------------------------------
    // Claims
    // -------------------------------------------------------------------------

    mapping(address heir => ClaimStatus) public claimStatus;
    mapping(address heir => uint256) public claimInitiatedAt;

    // -------------------------------------------------------------------------
    // Asset Allocations
    // -------------------------------------------------------------------------

    mapping(bytes32 assetId => Allocation) public allocations;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event CheckedIn(uint256 timestamp);

    event ParametersUpdated(uint256 checkInInterval, uint256 gracePeriod, uint256 contestableWindow);

    event HeirAdded(address indexed heir);
    event HeirRemoved(address indexed heir);

    event ClaimInitiated(address indexed heir, uint256 timestamp);

    event ClaimFinalized(address indexed heir, uint256 timestamp);

    event AssetAssigned(bytes32 indexed assetId, address indexed heir, address indexed executor);

    event AssetRemoved(bytes32 indexed assetId);

    event AssetClaimed(bytes32 indexed assetId, address indexed heir, uint256 timestamp);

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------

    error NotOwner();
    error ParametersLockedWhileNotGreen();
    error IntervalTooShort();
    error ContestableWindowTooShort();

    error VaultNotRed();

    error ClaimAlreadyInitiated();
    error ClaimNotContestable();
    error ContestableWindowNotElapsed();

    error LivenessNotRegistered();
    error LivenessAlreadyRegistered();

    error InvalidHeir();
    error HeirAlreadyRegistered();
    error HeirNotRegistered();
    error HeirChangesLocked();

    error InvalidAssetId();
    error InvalidExecutor();
    error AssetNotAssigned();
    error AssetAlreadyAssigned();
    error AssetAlreadyClaimed();
    error NotAssignedHeir();
    error ClaimNotFinalized();

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyGreen() {
        if (getStatus() != Status.Green) {
            revert HeirChangesLocked();
        }
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor & Initializer
    // -------------------------------------------------------------------------

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _owner,
        WorldIDVerifierAdapter _verifier,
        uint256 _checkInInterval,
        uint256 _gracePeriod,
        uint256 _contestableWindow
    ) external initializer {
        if (_checkInInterval < MIN_CHECK_IN_INTERVAL) revert IntervalTooShort();
        if (_contestableWindow < MIN_CONTESTABLE_WINDOW) revert ContestableWindowTooShort();

        owner = _owner;
        verifier = _verifier;

        checkInInterval = _checkInInterval;
        gracePeriod = _gracePeriod;
        contestableWindow = _contestableWindow;

        lastCheckIn = block.timestamp;
    }

    // -------------------------------------------------------------------------
    // Vault status
    // -------------------------------------------------------------------------

    function getStatus() public view returns (Status) {
        uint256 elapsed = block.timestamp - lastCheckIn;

        if (elapsed < checkInInterval) {
            return Status.Green;
        }

        if (elapsed < checkInInterval + gracePeriod) {
            return Status.Amber;
        }

        return Status.Red;
    }

    // -------------------------------------------------------------------------
    // World ID / Liveness
    // -------------------------------------------------------------------------

    function registerLiveness(uint256 root, uint256 nullifierHash, uint256[8] calldata proof) external onlyOwner {
        if (livenessRegistered) {
            revert LivenessAlreadyRegistered();
        }

        verifier.registerNullifier(address(this), owner, root, nullifierHash, proof);

        livenessRegistered = true;
    }

    function checkIn(uint256 root, uint256 nullifierHash, uint256[8] calldata proof) external onlyOwner {
        if (!livenessRegistered) {
            revert LivenessNotRegistered();
        }

        verifier.verifyCheckIn(address(this), owner, root, nullifierHash, proof);

        lastCheckIn = block.timestamp;

        emit CheckedIn(block.timestamp);
    }

    // -------------------------------------------------------------------------
    // Parameters
    // -------------------------------------------------------------------------

    function updateParameters(uint256 _checkInInterval, uint256 _gracePeriod, uint256 _contestableWindow)
        external
        onlyOwner
    {
        if (getStatus() != Status.Green) {
            revert ParametersLockedWhileNotGreen();
        }
        if (_checkInInterval < MIN_CHECK_IN_INTERVAL) revert IntervalTooShort();
        if (_contestableWindow < MIN_CONTESTABLE_WINDOW) revert ContestableWindowTooShort();

        checkInInterval = _checkInInterval;
        gracePeriod = _gracePeriod;
        contestableWindow = _contestableWindow;

        emit ParametersUpdated(_checkInInterval, _gracePeriod, _contestableWindow);
    }

    // -------------------------------------------------------------------------
    // Heir management
    // -------------------------------------------------------------------------

    /**
     * @notice Registers an address as an authorized heir.
     * @dev Can only happen while the vault is Green.
     */
    function addHeir(address heir) external onlyOwner onlyGreen {
        if (heir == address(0) || heir == owner) {
            revert InvalidHeir();
        }

        if (isHeir[heir]) {
            revert HeirAlreadyRegistered();
        }

        isHeir[heir] = true;
        heirs.push(heir);

        emit HeirAdded(heir);
    }

    /**
     * @notice Removes an address from the authorized heir set.
     * @dev Can only happen while the vault is Green.
     */
    function removeHeir(address heir) external onlyOwner onlyGreen {
        if (!isHeir[heir]) {
            revert HeirNotRegistered();
        }

        isHeir[heir] = false;

        // Remove from enumerable array using swap-and-pop.
        uint256 length = heirs.length;

        for (uint256 i = 0; i < length; i++) {
            if (heirs[i] == heir) {
                heirs[i] = heirs[length - 1];
                heirs.pop();
                break;
            }
        }

        emit HeirRemoved(heir);
    }

    /**
     * @notice Returns all currently registered heirs.
     */
    function getHeirs() external view returns (address[] memory) {
        return heirs;
    }

    /**
     * @notice Returns the number of currently registered heirs.
     */
    function getHeirCount() external view returns (uint256) {
        return heirs.length;
    }

    // -------------------------------------------------------------------------
    // Asset Allocation
    // -------------------------------------------------------------------------

    /**
     * @notice Assigns an asset to an authorized heir via a designated executor.
     * @dev Can only happen while the vault is Green.
     */
    function assignAsset(bytes32 assetId, address heir, IVaultExecutor executor) external onlyOwner onlyGreen {
        if (assetId == bytes32(0)) revert InvalidAssetId();
        if (!isHeir[heir]) revert HeirNotRegistered();
        if (address(executor) == address(0)) revert InvalidExecutor();

        Allocation storage alloc = allocations[assetId];
        if (alloc.exists && !alloc.executed) revert AssetAlreadyAssigned();

        allocations[assetId] =
            Allocation({heir: heir, executor: executor, assetId: assetId, exists: true, executed: false});

        emit AssetAssigned(assetId, heir, address(executor));
    }

    /**
     * @notice Removes an asset assignment.
     * @dev Can only happen while the vault is Green.
     */
    function removeAsset(bytes32 assetId) external onlyOwner onlyGreen {
        Allocation storage alloc = allocations[assetId];
        if (!alloc.exists || alloc.executed) revert AssetNotAssigned();

        delete allocations[assetId];

        emit AssetRemoved(assetId);
    }

    // -------------------------------------------------------------------------
    // Claim lifecycle & Execution
    // -------------------------------------------------------------------------

    function initiateClaim() external {
        // Only registered heirs can initiate.
        if (!isHeir[msg.sender]) {
            revert HeirNotRegistered();
        }

        if (getStatus() != Status.Red) {
            revert VaultNotRed();
        }

        ClaimStatus status = claimStatus[msg.sender];

        bool staleContestable = status == ClaimStatus.Contestable && lastCheckIn >= claimInitiatedAt[msg.sender];

        if (status != ClaimStatus.NotInitiated && !staleContestable) {
            revert ClaimAlreadyInitiated();
        }

        claimStatus[msg.sender] = ClaimStatus.Contestable;
        claimInitiatedAt[msg.sender] = block.timestamp;

        emit ClaimInitiated(msg.sender, block.timestamp);
    }

    function finalizeClaim() external {
        // Finalization is restricted to a currently authorized heir.
        if (!isHeir[msg.sender]) {
            revert HeirNotRegistered();
        }

        if (claimStatus[msg.sender] != ClaimStatus.Contestable) {
            revert ClaimNotContestable();
        }

        if (getStatus() != Status.Red) {
            revert VaultNotRed();
        }

        // Owner must not have checked in after this claim started.
        if (lastCheckIn >= claimInitiatedAt[msg.sender]) {
            revert ClaimNotContestable();
        }

        if (block.timestamp < claimInitiatedAt[msg.sender] + contestableWindow) {
            revert ContestableWindowNotElapsed();
        }

        claimStatus[msg.sender] = ClaimStatus.Claimed;

        emit ClaimFinalized(msg.sender, block.timestamp);
    }

    /**
     * @notice Executes control transfer for a specific allocated asset.
     * @dev Gated on heir claim finalization and CEI pattern.
     */
    function executeClaim(bytes32 assetId) external nonReentrant {
        Allocation storage alloc = allocations[assetId];

        if (!alloc.exists) revert AssetNotAssigned();
        if (alloc.executed) revert AssetAlreadyClaimed();
        if (alloc.heir != msg.sender) revert NotAssignedHeir();
        if (!isHeir[msg.sender]) revert HeirNotRegistered();
        if (claimStatus[msg.sender] != ClaimStatus.Claimed) revert ClaimNotFinalized();

        // Checks-Effects-Interactions (CEI): Mark executed before external call
        alloc.executed = true;

        emit AssetClaimed(assetId, msg.sender, block.timestamp);

        alloc.executor.transferControl(owner, msg.sender);
    }
}
