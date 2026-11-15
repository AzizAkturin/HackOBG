# contracts

`FightClub.sol`, the single Fight Club contract on Monad testnet (chain 10143). The spec is [docs/blockchain.md section 5](../docs/blockchain.md#5-contract-specification). Config follows the `monad-developers/foundry-monad` template.

## Setup

forge-std is a git submodule of the parent repo. After cloning, run:

```bash
git submodule update --init --recursive
```

## Build and test

```bash
pnpm contracts:build
pnpm contracts:test
forge test --root contracts --gas-report
```

## Deploy

The deployer keystore is the owner, `0x7e09f0Fc577491E14ccFd0f210000d4b36C585a8`. Check it first:

```bash
cast wallet address --account deployer
```

Deploy and configure the three weight classes, the operator, and the treasury. `TREASURY_ADDRESS` is optional and defaults to the owner. Forge asks for the keystore password.

```bash
OPERATOR_ADDRESS=0xaF4214Eb1C23B0EF171cFCdd5E48BD90f914B48F pnpm contracts:deploy
```

This runs:

```bash
cd contracts && forge script script/Deploy.s.sol:Deploy --rpc-url https://testnet-rpc.monad.xyz --account deployer --broadcast
```

The script does not register fighters. `registerFighter` is operator-only, so the backend seed does it. The weight classes ship with `configHash = 0x0`. Push the real hash with `setWeightClass` once the class JSON is final.

## Export

```bash
pnpm contracts:export
```

This writes `packages/shared/src/abi/fightClub.ts` from the build artifact. If `broadcast/Deploy.s.sol/10143/run-latest.json` exists, it also writes `packages/shared/deployments/10143.json` with `address`, `deployBlock`, and `txHash`. Pass `--dry-run` to print instead of write, `--chain <id>` to read another chain's broadcast, and `--broadcast-dir <path>` to read another broadcast folder.

## Verify

Replace `<addr>` with the address in `packages/shared/deployments/10143.json`. Run from `contracts/`.

```bash
# MonadVision (Sourcify, no key)
forge verify-contract <addr> src/FightClub.sol:FightClub --chain 10143 \
  --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/

# Monadscan (Etherscan-family key)
forge verify-contract <addr> src/FightClub.sol:FightClub --chain 10143 \
  --verifier etherscan --etherscan-api-key $MONADSCAN_KEY --watch
```
