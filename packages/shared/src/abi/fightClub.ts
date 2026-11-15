export const fightClubAbi = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "MAX_FIGHTERS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_FIGHT_SECONDS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint40",
        "internalType": "uint40"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_RAKE_BPS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "accruedRake",
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
    "name": "cancel",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelExpired",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claim",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "classes",
    "inputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "minBet",
        "type": "uint96",
        "internalType": "uint96"
      },
      {
        "name": "maxBet",
        "type": "uint96",
        "internalType": "uint96"
      },
      {
        "name": "rakeBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "voteDuration",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "settleGrace",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "active",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "configHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createRound",
    "inputs": [
      {
        "name": "classId",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "fighterIds",
        "type": "uint32[]",
        "internalType": "uint32[]"
      },
      {
        "name": "taskHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "lockTime",
        "type": "uint40",
        "internalType": "uint40"
      }
    ],
    "outputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "enter",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "fighterIndex",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "entries",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "amount",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "fighterIndex",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "voted",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "claimed",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fighters",
    "inputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "outputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "classId",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "wins",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "losses",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "profileHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextFighterId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nextRoundId",
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
    "name": "openVoting",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "revealCommit",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "pitchesHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "operator",
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
    "name": "paused",
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
    "name": "phaseOf",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum FightClub.Phase"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "poolByIndex",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint128",
        "internalType": "uint128"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "refund",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "registerFighter",
    "inputs": [
      {
        "name": "fighterOwner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "classId",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "profileHash",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "fighterId",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "roundFighters",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rounds",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct FightClub.Round",
        "components": [
          {
            "name": "classId",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "phase",
            "type": "uint8",
            "internalType": "enum FightClub.Phase"
          },
          {
            "name": "fighterCount",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "winnerIndex",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "lockTime",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "voteEnd",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "settleDeadline",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "taskHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "revealCommit",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "pitchesHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "totalPool",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "rake",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "minBet",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "maxBet",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "rakeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "voteDuration",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "settleGrace",
            "type": "uint32",
            "internalType": "uint32"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setOperator",
    "inputs": [
      {
        "name": "op",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setPaused",
    "inputs": [
      {
        "name": "p",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setTreasury",
    "inputs": [
      {
        "name": "t",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setWeightClass",
    "inputs": [
      {
        "name": "classId",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "c",
        "type": "tuple",
        "internalType": "struct FightClub.WeightClass",
        "components": [
          {
            "name": "minBet",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "maxBet",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "rakeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "voteDuration",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "settleGrace",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "active",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "configHash",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "settle",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "labelToIndex",
        "type": "uint8[]",
        "internalType": "uint8[]"
      },
      {
        "name": "judgeRank",
        "type": "uint8[]",
        "internalType": "uint8[]"
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "treasury",
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
    "name": "vote",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "label",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "votesByLabel",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdrawRake",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Claimed",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "payout",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Entered",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "fighterIndex",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "fighterPool",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "totalPool",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "FighterRegistered",
    "inputs": [
      {
        "name": "fighterId",
        "type": "uint32",
        "indexed": true,
        "internalType": "uint32"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "classId",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "profileHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Refunded",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoundCancelled",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "by",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoundCreated",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "classId",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "fighterIds",
        "type": "uint32[]",
        "indexed": false,
        "internalType": "uint32[]"
      },
      {
        "name": "taskHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "lockTime",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Settled",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "winnerIndex",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "winnerFighterId",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "labelToIndex",
        "type": "uint8[]",
        "indexed": false,
        "internalType": "uint8[]"
      },
      {
        "name": "totalPool",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "rake",
        "type": "uint128",
        "indexed": false,
        "internalType": "uint128"
      },
      {
        "name": "refundMode",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Voted",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "label",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VotingOpened",
    "inputs": [
      {
        "name": "roundId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "revealCommit",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "pitchesHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "voteEnd",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "WeightClassSet",
    "inputs": [
      {
        "name": "classId",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "c",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct FightClub.WeightClass",
        "components": [
          {
            "name": "minBet",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "maxBet",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "rakeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "voteDuration",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "settleGrace",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "active",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "configHash",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyClaimed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyVoted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadFighterCount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadFighterIndex",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadLabel",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadLockTime",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadReveal",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BetOutOfRange",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BettingClosed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ClassInactive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DifferentFighter",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DuplicateFighter",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Expired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "FighterClassMismatch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientRake",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidClass",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoEntry",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotExpired",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotOperator",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotPermutation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotRefundable",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotTreasury",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotWinner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Paused",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Reentrancy",
    "inputs": []
  },
  {
    "type": "error",
    "name": "RefundMode",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooEarly",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnknownFighter",
    "inputs": []
  },
  {
    "type": "error",
    "name": "VotingClosed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WrongPhase",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroCommit",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroValue",
    "inputs": []
  }
] as const;
