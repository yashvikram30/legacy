// Auto-extracted from Foundry artifacts in legacy-contract/out
export const LegacyVaultFactoryABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_implementation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createVault",
    "inputs": [
      {
        "name": "verifier",
        "type": "address",
        "internalType": "contract WorldIDVerifierAdapter"
      },
      {
        "name": "checkInInterval",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "gracePeriod",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "contestableWindow",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getVaults",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "implementation",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "VaultCreated",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "FailedDeployment",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientBalance",
    "inputs": [
      {
        "name": "balance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidImplementation",
    "inputs": []
  }
] as const;

export const LegacyVaultABI = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "MIN_CHECK_IN_INTERVAL",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MIN_CONTESTABLE_WINDOW",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "addHeir",
    "inputs": [
      {
        "name": "heir",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allocations",
    "inputs": [
      {
        "name": "assetId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "heir",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "executor",
        "type": "address",
        "internalType": "contract IVaultExecutor"
      },
      {
        "name": "assetId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "exists",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "executed",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "assignAsset",
    "inputs": [
      {
        "name": "assetId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "heir",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "executor",
        "type": "address",
        "internalType": "contract IVaultExecutor"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "checkIn",
    "inputs": [
      {
        "name": "root",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "nullifierHash",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "proof",
        "type": "uint256[8]",
        "internalType": "uint256[8]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "checkInInterval",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimInitiatedAt",
    "inputs": [
      {
        "name": "heir",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "claimStatus",
    "inputs": [
      {
        "name": "heir",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum LegacyVault.ClaimStatus"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "contestableWindow",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "executeClaim",
    "inputs": [
      {
        "name": "assetId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "finalizeClaim",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getHeirCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getHeirs",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getStatus",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum LegacyVault.Status"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "gracePeriod",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "initialize",
    "inputs": [
      {
        "name": "_owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_verifier",
        "type": "address",
        "internalType": "contract WorldIDVerifierAdapter"
      },
      {
        "name": "_checkInInterval",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_gracePeriod",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_contestableWindow",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "initiateClaim",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isHeir",
    "inputs": [
      {
        "name": "heir",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lastCheckIn",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "livenessRegistered",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registerLiveness",
    "inputs": [
      {
        "name": "root",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "nullifierHash",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "proof",
        "type": "uint256[8]",
        "internalType": "uint256[8]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeAsset",
    "inputs": [
      {
        "name": "assetId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "removeHeir",
    "inputs": [
      {
        "name": "heir",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateParameters",
    "inputs": [
      {
        "name": "_checkInInterval",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_gracePeriod",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_contestableWindow",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "verifier",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract WorldIDVerifierAdapter"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "AssetAssigned",
    "inputs": [
      {
        "name": "assetId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "heir",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "executor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AssetClaimed",
    "inputs": [
      {
        "name": "assetId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "heir",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AssetRemoved",
    "inputs": [
      {
        "name": "assetId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CheckedIn",
    "inputs": [
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ClaimFinalized",
    "inputs": [
      {
        "name": "heir",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ClaimInitiated",
    "inputs": [
      {
        "name": "heir",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "HeirAdded",
    "inputs": [
      {
        "name": "heir",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "HeirRemoved",
    "inputs": [
      {
        "name": "heir",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Initialized",
    "inputs": [
      {
        "name": "version",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ParametersUpdated",
    "inputs": [
      {
        "name": "checkInInterval",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "gracePeriod",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "contestableWindow",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AssetAlreadyAssigned",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AssetAlreadyClaimed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AssetNotAssigned",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ClaimAlreadyInitiated",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ClaimNotContestable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ClaimNotFinalized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ContestableWindowNotElapsed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ContestableWindowTooShort",
    "inputs": []
  },
  {
    "type": "error",
    "name": "HeirAlreadyRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "HeirChangesLocked",
    "inputs": []
  },
  {
    "type": "error",
    "name": "HeirNotRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "IntervalTooShort",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidAssetId",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidExecutor",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidHeir",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidInitialization",
    "inputs": []
  },
  {
    "type": "error",
    "name": "LivenessAlreadyRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "LivenessNotRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAssignedHeir",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotInitializing",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ParametersLockedWhileNotGreen",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "VaultNotRed",
    "inputs": []
  }
] as const;

export const WorldIDVerifierAdapterABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_worldId",
        "type": "address",
        "internalType": "contract IWorldID"
      },
      {
        "name": "_groupId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_externalNullifierHash",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "externalNullifierHash",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "groupId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hashSignal",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "signalAddress",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "registerNullifier",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "signalAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "root",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "nullifierHash",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "proof",
        "type": "uint256[8]",
        "internalType": "uint256[8]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vaultNullifier",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "registeredNullifierHash",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verifyCheckIn",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "signalAddress",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "root",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "nullifierHash",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "proof",
        "type": "uint256[8]",
        "internalType": "uint256[8]"
      }
    ],
    "outputs": [],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "worldId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IWorldID"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "error",
    "name": "AlreadyRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NullifierMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NullifierNotRegistered",
    "inputs": []
  }
] as const;

export const ERC20AdapterABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "amount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "checkOwnership",
    "inputs": [
      {
        "name": "expectedOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "token",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferControl",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vault",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "TokenTransferred",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "InsufficientAllowance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientBalance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotVault",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const;

export const ERC721AdapterABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_tokenContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_tokenId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "checkOwnership",
    "inputs": [
      {
        "name": "expectedOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenContract",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC721"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferControl",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vault",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "NFTOwnershipTransferred",
    "inputs": [
      {
        "name": "tokenContract",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "tokenId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotCurrentOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotVault",
    "inputs": []
  }
] as const;

export const ENSResolverAdapterABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_registry",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_node",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "checkOwnership",
    "inputs": [
      {
        "name": "expectedOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "node",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registry",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IENSRegistry"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferControl",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vault",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "ENSOwnershipTransferred",
    "inputs": [
      {
        "name": "node",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidNode",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotCurrentOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotVault",
    "inputs": []
  }
] as const;
