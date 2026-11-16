export const wabAbi = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "MAX_FEE_BPS",
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
    "name": "MAX_ROUND_ODDS",
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
    "name": "MIN_ROUND_ODDS",
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
    "name": "ROUNDS_TO_WIN",
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
    "name": "buy",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "side",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "minShares",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "shares",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "cancel",
    "inputs": [
      {
        "name": "matchId",
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
        "name": "matchId",
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
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "payout",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
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
        "name": "minTrade",
        "type": "uint96",
        "internalType": "uint96"
      },
      {
        "name": "maxTrade",
        "type": "uint96",
        "internalType": "uint96"
      },
      {
        "name": "bankroll",
        "type": "uint96",
        "internalType": "uint96"
      },
      {
        "name": "liquidity",
        "type": "uint96",
        "internalType": "uint96"
      },
      {
        "name": "feeBps",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "tradeWindow",
        "type": "uint32",
        "internalType": "uint32"
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
    "name": "createMatch",
    "inputs": [
      {
        "name": "classId",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "fighterA",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "fighterB",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "taskHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "tradeEnd",
        "type": "uint40",
        "internalType": "uint40"
      }
    ],
    "outputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
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
    "name": "fundHouse",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "hasVoted",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "",
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
    "name": "houseBalance",
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
    "name": "isTradingOpen",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "matches",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct WAB.Match",
        "components": [
          {
            "name": "classId",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "phase",
            "type": "uint8",
            "internalType": "enum WAB.Phase"
          },
          {
            "name": "round",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "winsA",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "winsB",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "winner",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "fighterA",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "fighterB",
            "type": "uint32",
            "internalType": "uint32"
          },
          {
            "name": "tradeEnd",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "voteEnd",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "deadline",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "anchor",
            "type": "int128",
            "internalType": "int128"
          },
          {
            "name": "roundOdds",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "sharesA",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "sharesB",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "pool",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "fees",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "refundOwed",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "refundFunds",
            "type": "uint128",
            "internalType": "uint128"
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
            "name": "minTrade",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "maxTrade",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "liquidity",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "feeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "tradeWindow",
            "type": "uint32",
            "internalType": "uint32"
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
    "name": "nextMatchId",
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
        "name": "matchId",
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
    "name": "openingPriceA",
    "inputs": [
      {
        "name": "fighterA",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "fighterB",
        "type": "uint32",
        "internalType": "uint32"
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
    "name": "positions",
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
        "name": "sharesA",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "sharesB",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "paid",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "received",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "name": "settled",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "priceA",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "quoteBuy",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "side",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "shares",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "fee",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "quoteSell",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "side",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "shares",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "proceeds",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "fee",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "refund",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
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
    "name": "resolveRound",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "swapped",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "tieWinner",
        "type": "uint8",
        "internalType": "uint8"
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
    "name": "roundOddsFor",
    "inputs": [
      {
        "name": "fighterA",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "fighterB",
        "type": "uint32",
        "internalType": "uint32"
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
    "name": "sell",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "side",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "shares",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minProceeds",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "proceeds",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
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
        "internalType": "struct WAB.WeightClass",
        "components": [
          {
            "name": "minTrade",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "maxTrade",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "bankroll",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "liquidity",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "feeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "tradeWindow",
            "type": "uint32",
            "internalType": "uint32"
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
    "name": "stageOf",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
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
        "name": "matchId",
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
    "name": "votes",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "round",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "label0",
        "type": "uint32",
        "internalType": "uint32"
      },
      {
        "name": "label1",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdrawHouse",
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
        "name": "matchId",
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
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
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
    "name": "HouseFunded",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "houseBalance",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "HouseWithdrawn",
    "inputs": [
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
      },
      {
        "name": "houseBalance",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MatchCancelled",
    "inputs": [
      {
        "name": "matchId",
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
    "name": "MatchCreated",
    "inputs": [
      {
        "name": "matchId",
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
        "name": "fighterA",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "fighterB",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "roundOdds",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "priceA",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "taskHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "tradeEnd",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      },
      {
        "name": "time",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MatchResolved",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "winner",
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
        "name": "payout",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "houseReturn",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Refunded",
    "inputs": [
      {
        "name": "matchId",
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
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "RoundResolved",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "round",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "winner",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "votesA",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "votesB",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      },
      {
        "name": "swapped",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "winsA",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "winsB",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "priceA",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "tradeEnd",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      },
      {
        "name": "time",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Traded",
    "inputs": [
      {
        "name": "matchId",
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
        "name": "side",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "isBuy",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "mon",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "shares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "fee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "priceA",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "time",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Voted",
    "inputs": [
      {
        "name": "matchId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "round",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
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
        "name": "matchId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "round",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
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
      },
      {
        "name": "time",
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
        "internalType": "struct WAB.WeightClass",
        "components": [
          {
            "name": "minTrade",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "maxTrade",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "bankroll",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "liquidity",
            "type": "uint96",
            "internalType": "uint96"
          },
          {
            "name": "feeBps",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "tradeWindow",
            "type": "uint32",
            "internalType": "uint32"
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
    "name": "AlreadySettled",
    "inputs": []
  },
  {
    "type": "error",
    "name": "AlreadyVoted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadLabel",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadReveal",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadSide",
    "inputs": []
  },
  {
    "type": "error",
    "name": "BadTradeEnd",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ClassInactive",
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
    "name": "HouseTooSmall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientHouse",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidClass",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MarketFull",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoPosition",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotEnoughShares",
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
    "name": "NotTreasury",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NothingToClaim",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Paused",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PriceFinal",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Reentrancy",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SameFighter",
    "inputs": []
  },
  {
    "type": "error",
    "name": "Slippage",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooEarly",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TradeOutOfRange",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TradingClosed",
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
  }
] as const;
