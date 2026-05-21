const storageRefTuple = {
  type: "tuple",
  components: [
    { name: "platform", type: "string" },
    { name: "path", type: "string" },
    { name: "keyRef", type: "string" }
  ]
} as const;

const sovereignAgentParamsTuple = {
  name: "params",
  type: "tuple",
  components: [
    { name: "executor", type: "address" },
    { name: "ttl", type: "uint256" },
    { name: "userPublicKey", type: "bytes" },
    { name: "pollIntervalBlocks", type: "uint64" },
    { name: "maxPollBlock", type: "uint64" },
    { name: "taskIdMarker", type: "string" },
    { name: "deliveryTarget", type: "address" },
    { name: "deliverySelector", type: "bytes4" },
    { name: "deliveryGasLimit", type: "uint256" },
    { name: "deliveryMaxFeePerGas", type: "uint256" },
    { name: "deliveryMaxPriorityFeePerGas", type: "uint256" },
    { name: "cliType", type: "uint16" },
    { name: "prompt", type: "string" },
    { name: "encryptedSecrets", type: "bytes" },
    { ...storageRefTuple, name: "convoHistory" },
    { ...storageRefTuple, name: "output" },
    { name: "skills", type: "tuple[]", components: storageRefTuple.components },
    { ...storageRefTuple, name: "systemPrompt" },
    { name: "model", type: "string" },
    { name: "tools", type: "string[]" },
    { name: "maxTurns", type: "uint16" },
    { name: "maxTokens", type: "uint32" },
    { name: "rpcUrls", type: "string" }
  ]
} as const;

const sovereignScheduleConfigTuple = {
  name: "schedule",
  type: "tuple",
  components: [
    { name: "schedulerGas", type: "uint32" },
    { name: "frequency", type: "uint32" },
    { name: "schedulerTtl", type: "uint32" },
    { name: "maxFeePerGas", type: "uint256" },
    { name: "maxPriorityFeePerGas", type: "uint256" },
    { name: "value", type: "uint256" }
  ]
} as const;

const sovereignRollingConfigTuple = {
  name: "rolling",
  type: "tuple",
  components: [
    { name: "windowNumCalls", type: "uint32" },
    { name: "rolloverThresholdBps", type: "uint16" },
    { name: "rolloverRetryEveryCalls", type: "uint16" }
  ]
} as const;

export const sovereignFactoryAbi = [
  {
    name: "deployHarness",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "userSalt", type: "bytes32" }],
    outputs: [{ name: "harness", type: "address" }]
  },
  {
    name: "predictHarness",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "userSalt", type: "bytes32" }
    ],
    outputs: [
      { name: "harness", type: "address" },
      { name: "childSalt", type: "bytes32" }
    ]
  },
  {
    name: "predictCompressedHarness",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "userSalt", type: "bytes32" }
    ],
    outputs: [
      { name: "harness", type: "address" },
      { name: "compressedSalt", type: "bytes32" },
      { name: "childSalt", type: "bytes32" }
    ]
  },
  {
    name: "getDkmsDerivation",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "userSalt", type: "bytes32" }
    ],
    outputs: [
      { name: "dkmsOwner", type: "address" },
      { name: "keyIndex", type: "uint256" },
      { name: "keyFormat", type: "uint8" }
    ]
  },
  {
    name: "launchSovereignCompressed",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "userSalt", type: "bytes32" },
      { name: "executor", type: "address" },
      { name: "dkmsTtl", type: "uint64" },
      { name: "dkmsFunding", type: "uint256" },
      sovereignAgentParamsTuple,
      sovereignScheduleConfigTuple,
      { name: "schedulerLockDuration", type: "uint256" },
      { name: "schedulerFunding", type: "uint256" },
      { name: "windowNumCalls", type: "uint32" }
    ],
    outputs: [
      { name: "harness", type: "address" },
      { name: "dkmsPaymentAddress", type: "address" },
      { name: "schedulerCallId", type: "uint256" }
    ]
  }
] as const;

export const sovereignHarnessAbi = [
  {
    name: "configureFundAndStart",
    type: "function",
    stateMutability: "payable",
    inputs: [
      sovereignAgentParamsTuple,
      sovereignScheduleConfigTuple,
      sovereignRollingConfigTuple,
      { name: "schedulerLockDuration", type: "uint256" }
    ],
    outputs: [{ name: "schedulerCallId", type: "uint256" }]
  },
  {
    name: "onSovereignAgentResult",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "bytes32" },
      { name: "result", type: "bytes" }
    ],
    outputs: []
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }]
  },
  {
    name: "configured",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }]
  },
  {
    name: "wakeMode",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }]
  },
  {
    name: "activeCallId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "activeNumCalls",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint32" }]
  },
  {
    name: "currentSeriesId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }]
  },
  {
    name: "pendingSeriesId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }]
  },
  {
    name: "pendingCallId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "thresholdIndex",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint32" }]
  },
  {
    name: "stop",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  }
] as const;

export const persistentFactoryAbi = [
  {
    name: "predictLauncher",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "userSalt", type: "bytes32" }
    ],
    outputs: [
      { name: "launcher", type: "address" },
      { name: "childSalt", type: "bytes32" }
    ]
  },
  {
    name: "getDkmsDerivation",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "userSalt", type: "bytes32" }
    ],
    outputs: [
      { name: "dkmsOwner", type: "address" },
      { name: "keyIndex", type: "uint256" },
      { name: "keyFormat", type: "uint8" }
    ]
  },
  {
    name: "predictCompressedLauncher",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "userSalt", type: "bytes32" }
    ],
    outputs: [
      { name: "launcher", type: "address" },
      { name: "compressedSalt", type: "bytes32" },
      { name: "childSalt", type: "bytes32" }
    ]
  },
  {
    name: "launchPersistentCompressed",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "userSalt", type: "bytes32" },
      { name: "executor", type: "address" },
      { name: "dkmsTtl", type: "uint64" },
      { name: "dkmsFunding", type: "uint256" },
      { name: "persistentInput", type: "bytes" },
      {
        name: "schedule",
        type: "tuple",
        components: [
          { name: "schedulerGas", type: "uint32" },
          { name: "schedulerTtl", type: "uint32" },
          { name: "maxFeePerGas", type: "uint256" },
          { name: "maxPriorityFeePerGas", type: "uint256" },
          { name: "value", type: "uint256" }
        ]
      },
      { name: "schedulerLockDuration", type: "uint256" },
      { name: "schedulerFunding", type: "uint256" }
    ],
    outputs: [
      { name: "launcher", type: "address" },
      { name: "dkmsPaymentAddress", type: "address" },
      { name: "callId", type: "uint256" }
    ]
  }
] as const;

export const ritualWalletAbi = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "lockDuration", type: "uint256" }],
    outputs: []
  },
  {
    name: "depositFor",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "user", type: "address" },
      { name: "lockDuration", type: "uint256" }
    ],
    outputs: []
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "lockUntil",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: []
  }
] as const;

export const asyncJobTrackerAbi = [
  {
    name: "hasPendingJobForSender",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "sender", type: "address" }],
    outputs: [{ type: "bool" }]
  },
  {
    name: "isLongRunning",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [{ type: "bool" }]
  },
  {
    name: "isPhase1Settled",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [{ type: "bool" }]
  }
] as const;

export const schedulerAbi = [
  {
    name: "calls",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "callId", type: "uint256" }],
    outputs: [
      { name: "to", type: "address" },
      { name: "caller", type: "address" },
      { name: "startBlock", type: "uint32" },
      { name: "numCalls", type: "uint32" },
      { name: "frequency", type: "uint32" },
      { name: "gas", type: "uint32" },
      { name: "ttl", type: "uint32" },
      { name: "state", type: "uint8" },
      { name: "maxFeePerGas", type: "uint256" },
      { name: "maxPriorityFeePerGas", type: "uint256" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" }
    ]
  },
  {
    name: "getCallState",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "callId", type: "uint256" }],
    outputs: [{ name: "state", type: "uint8" }]
  }
] as const;

export const ritualMirrorRegistryAbi = [
  {
    name: "createMirror",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "profileHash", type: "bytes32" },
      { name: "metadataURI", type: "string" }
    ],
    outputs: []
  },
  {
    name: "updateMirror",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "profileHash", type: "bytes32" },
      { name: "metadataURI", type: "string" }
    ],
    outputs: []
  },
  {
    name: "getMirror",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "profileHash", type: "bytes32" },
          { name: "metadataURI", type: "string" },
          { name: "agentWorkspaceURI", type: "string" },
          { name: "persistentAgentLauncher", type: "address" },
          { name: "genesisJobId", type: "bytes32" },
          { name: "createdAt", type: "uint256" },
          { name: "version", type: "uint256" },
          { name: "active", type: "bool" }
        ]
      }
    ]
  },
  {
    name: "hasMirror",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }]
  }
] as const;

export const ritualMirrorNftAbi = [
  {
    name: "mintMirror",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "uri", type: "string" }
    ],
    outputs: [{ name: "tokenId", type: "uint256" }]
  },
  {
    name: "mirrorOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }]
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }]
  }
] as const;

export const ritualMirrorSovereignConsumerAbi = [
  {
    name: "launchGenesis",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "encodedIdentityInput", type: "bytes" }],
    outputs: [{ name: "jobId", type: "bytes32" }]
  },
  {
    name: "jobOwner",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "jobId", type: "bytes32" }],
    outputs: [{ type: "address" }]
  },
  {
    name: "recordGenesisFromOperator",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "jobId", type: "bytes32" },
      { name: "profileHash", type: "bytes32" },
      { name: "metadataURI", type: "string" },
      { name: "agentWorkspaceURI", type: "string" }
    ],
    outputs: []
  }
] as const;

export const ritualMirrorAgentManagerAbi = [
  {
    name: "recordSpawnedAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "launcher", type: "address" },
      { name: "workspaceURI", type: "string" }
    ],
    outputs: []
  },
  {
    name: "requestSpawn",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "workspaceURI", type: "string" },
      { name: "configHash", type: "bytes32" }
    ],
    outputs: []
  },
  {
    name: "agents",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "launcher", type: "address" },
      { name: "workspaceURI", type: "string" },
      { name: "status", type: "uint8" },
      { name: "updatedAt", type: "uint256" }
    ]
  }
] as const;

export const teeServiceRegistryAbi = [
  {
    name: "getServicesByCapability",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "capability", type: "uint8" },
      { name: "checkValidity", type: "bool" }
    ],
    outputs: [
      {
        type: "tuple[]",
        components: [
          {
            name: "node",
            type: "tuple",
            components: [
              { name: "paymentAddress", type: "address" },
              { name: "teeAddress", type: "address" },
              { name: "teeType", type: "uint8" },
              { name: "publicKey", type: "bytes" },
              { name: "endpoint", type: "string" },
              { name: "certPubKeyHash", type: "bytes32" },
              { name: "capability", type: "uint8" }
            ]
          },
          { name: "isValid", type: "bool" },
          { name: "workloadId", type: "bytes32" }
        ]
      }
    ]
  }
] as const;
