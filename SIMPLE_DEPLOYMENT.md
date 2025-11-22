# THE BLOB - Simple Deployment Guide (Ronin Saigon)

## What You Need

1. **Your wallet** with testnet RON for gas
2. **Ronin Saigon RPC**: `https://saigon-testnet.roninchain.com/rpc`
3. **Target owner**: `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe`

## Step 1: Get Testnet RON

Visit: https://faucet.roninchain.com/

## Step 2: Configure Environment

Edit `contracts/.env.ronin.saigon`:

```bash
RPC_URL=https://saigon-testnet.roninchain.com/rpc
CHAIN_ID=2021

DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
DEPLOYER_ADDRESS=0xYOUR_ADDRESS

REGISTRY_OWNER=0xYOUR_ADDRESS
VAULT_OWNER=0xYOUR_ADDRESS

# Deployment doesn't need real USDC - use any ERC20 address or deploy a test token
USDC_ADDRESS=0x0000000000000000000000000000000000000000

REGISTRATION_PRICE=50000000
```

## Step 3: Deploy Contracts

```bash
cd contracts

# Deploy
forge script script/DeployMain.s.sol:DeployMain \
  --rpc-url https://saigon-testnet.roninchain.com/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --legacy
```

**Save the addresses**:
- Main: `0x...`
- Registry: `0x...`
- Vault: `0x...`

## Step 4: Transfer Ownership (ONE STEP!)

Update `.env.ronin.saigon`:
```bash
MAIN_ADDRESS=0x...
REGISTRY_ADDRESS=0x...
VAULT_ADDRESS=0x...
```

Transfer ownership:
```bash
forge script script/TransferOwnership.s.sol:TransferOwnership \
  --rpc-url https://saigon-testnet.roninchain.com/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --legacy
```

**Done!** Ownership is transferred in ONE step. No acceptance needed.

## Step 5: Verify

```bash
cast call $MAIN_ADDRESS "owner()(address)" --rpc-url https://saigon-testnet.roninchain.com/rpc
# Should return: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
```

## That's It!

Your contracts are deployed and owned by the Coinbase server wallet.
