# THE BLOB - Deployment & Ownership Transfer Guide

**Target Network**: Ronin Saigon Testnet (Chain ID: 2021)
**Final Owner**: `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe` (Coinbase Server Wallet)

---

## Overview

This guide walks you through:
1. Deploying contracts with YOUR wallet (that has RON for gas)
2. Transferring ownership to the Coinbase server wallet
3. Accepting ownership with the Coinbase wallet
4. Verifying the ownership transfer

---

## Prerequisites

### 1. Get Testnet RON
Visit the Ronin faucet to get testnet RON for gas:
- **Primary**: https://faucet.roninchain.com/
- **Alternative**: https://faucets.chain.link/ronin-saigon

Request RON for your deployment wallet address.

### 2. Prepare Environment Variables

Create `contracts/.env.ronin.saigon`:

```bash
# Ronin Saigon Network
RPC_URL=https://saigon-testnet.roninchain.com/rpc
CHAIN_ID=2021

# YOUR deployment wallet (must have RON)
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
DEPLOYER_ADDRESS=0xYOUR_ADDRESS_HERE

# Initial owner will be your address (will transfer later)
REGISTRY_OWNER=0xYOUR_ADDRESS_HERE
VAULT_OWNER=0xYOUR_ADDRESS_HERE

# Mock USDC address (deploy first or use existing)
USDC_ADDRESS=0xMOCK_USDC_ADDRESS_HERE

# Registration price: 50 USDC (6 decimals)
REGISTRATION_PRICE=50000000
```

---

## Step 1: Deploy Mock USDC (Optional)

If you don't have a test USDC token, deploy the MockUSDC:

```bash
cd contracts

# Load environment
source .env.ronin.saigon

# Deploy MockUSDC
forge create src/test/MockUSDC.sol:MockUSDC \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --legacy

# Copy the deployed address and update USDC_ADDRESS in .env.ronin.saigon
```

**Example Output**:
```
Deployed to: 0x1234567890abcdef...
Transaction hash: 0xabcdef...
```

Update your `.env.ronin.saigon`:
```bash
USDC_ADDRESS=0x1234567890abcdef...
```

---

## Step 2: Deploy Main Contracts

Deploy ProjectRegistry, RewardVault, and Main:

```bash
# Compile contracts
forge build

# Deploy (dry run first)
forge script script/DeployMain.s.sol:DeployMain \
  --rpc-url $RPC_URL \
  --sender $DEPLOYER_ADDRESS

# Deploy for real
forge script script/DeployMain.s.sol:DeployMain \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --legacy
```

**Expected Output**:
```
== Logs ==
  Deploying contracts with account: 0xYOUR_ADDRESS
  ProjectRegistry deployed at: 0xREGISTRY_ADDRESS
  RewardVault deployed at: 0xVAULT_ADDRESS
  Main deployed at: 0xMAIN_ADDRESS
```

**Save these addresses!** You'll need them for ownership transfer.

---

## Step 3: Verify Deployment

Check that contracts are deployed correctly:

```bash
# Check Main owner
cast call 0xMAIN_ADDRESS "owner()(address)" --rpc-url $RPC_URL
# Should return: YOUR_ADDRESS

# Check Registry owner
cast call 0xREGISTRY_ADDRESS "owner()(address)" --rpc-url $RPC_URL
# Should return: YOUR_ADDRESS

# Check Vault owner
cast call 0xVAULT_ADDRESS "owner()(address)" --rpc-url $RPC_URL
# Should return: YOUR_ADDRESS
```

View on explorer: https://saigon-app.roninchain.com/address/0xMAIN_ADDRESS

---

## Step 4: Fund Vault with USDC (Optional)

If you want to pre-fund the vault:

```bash
# Approve USDC spending
cast send $USDC_ADDRESS \
  "approve(address,uint256)" \
  0xVAULT_ADDRESS \
  1000000000000 \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --legacy

# Deposit USDC into vault (1M USDC = 1,000,000 * 10^6)
cast send 0xVAULT_ADDRESS \
  "deposit(uint256)" \
  1000000000000 \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --legacy

# Verify vault balance
cast call 0xVAULT_ADDRESS "totalAssets()(uint256)" --rpc-url $RPC_URL
```

---

## Step 5: Transfer Ownership to Coinbase Wallet

Now transfer ownership from YOUR wallet to the Coinbase server wallet.

### Create Environment File for Transfer

Add deployed addresses to your environment:

```bash
# In .env.ronin.saigon, add:
MAIN_ADDRESS=0xMAIN_ADDRESS_FROM_STEP_2
REGISTRY_ADDRESS=0xREGISTRY_ADDRESS_FROM_STEP_2
VAULT_ADDRESS=0xVAULT_ADDRESS_FROM_STEP_2
```

### Run Transfer Script

```bash
forge script script/TransferOwnership.s.sol:TransferOwnership \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --legacy
```

**Expected Output**:
```
=== Transferring Ownership ===
New Owner: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe

Main contract: 0xMAIN_ADDRESS
Current owner: 0xYOUR_ADDRESS
Ownership transferred to: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe

ProjectRegistry contract: 0xREGISTRY_ADDRESS
Current owner: 0xYOUR_ADDRESS
Ownership transferred to: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe

RewardVault contract: 0xVAULT_ADDRESS
Current owner: 0xYOUR_ADDRESS
Ownership transferred to: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe

=== Ownership Transfer Complete ===
```

---

## Step 6: Accept Ownership with Coinbase Wallet

⚠️ **IMPORTANT**: OpenZeppelin's `Ownable` uses a two-step transfer process. The new owner must **accept ownership**.

### Option A: Using Coinbase Wallet Private Key Directly

If you have the Coinbase wallet private key:

```bash
# Accept Main ownership
cast send 0xMAIN_ADDRESS \
  "acceptOwnership()" \
  --rpc-url $RPC_URL \
  --private-key <COINBASE_WALLET_PRIVATE_KEY> \
  --legacy

# Accept Registry ownership
cast send 0xREGISTRY_ADDRESS \
  "acceptOwnership()" \
  --rpc-url $RPC_URL \
  --private-key <COINBASE_WALLET_PRIVATE_KEY> \
  --legacy

# Accept Vault ownership
cast send 0xVAULT_ADDRESS \
  "acceptOwnership()" \
  --rpc-url $RPC_URL \
  --private-key <COINBASE_WALLET_PRIVATE_KEY> \
  --legacy
```

### Option B: Using Coinbase Developer Platform SDK

If you're using Coinbase CDP, create a script:

```typescript
// scripts/accept-ownership.ts
import { Wallet } from '@coinbase/coinbase-sdk';

const wallet = await Wallet.import(process.env.CDP_WALLET_DATA);

const contracts = {
  main: '0xMAIN_ADDRESS',
  registry: '0xREGISTRY_ADDRESS',
  vault: '0xVAULT_ADDRESS',
};

for (const [name, address] of Object.entries(contracts)) {
  const tx = await wallet.invokeContract({
    contractAddress: address,
    method: 'acceptOwnership',
    args: [],
  });

  console.log(`${name} ownership accepted:`, tx.getTransactionHash());
}
```

Run it:
```bash
npm run accept-ownership
```

---

## Step 7: Verify Ownership Transfer

Confirm the Coinbase wallet now owns all contracts:

```bash
# Check Main owner
cast call 0xMAIN_ADDRESS "owner()(address)" --rpc-url $RPC_URL
# Should return: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe

# Check Registry owner
cast call 0xREGISTRY_ADDRESS "owner()(address)" --rpc-url $RPC_URL
# Should return: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe

# Check Vault owner
cast call 0xVAULT_ADDRESS "owner()(address)" --rpc-url $RPC_URL
# Should return: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
```

✅ **Success!** All contracts are now owned by the Coinbase server wallet.

---

## Step 8: Save Deployment Information

Create a deployment record:

```bash
# contracts/deployments/ronin-saigon.json
{
  "network": "ronin-saigon",
  "chainId": 2021,
  "deployedAt": "2025-11-22T12:00:00Z",
  "deployer": "0xYOUR_ADDRESS",
  "owner": "0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe",
  "contracts": {
    "Main": {
      "address": "0xMAIN_ADDRESS",
      "txHash": "0x..."
    },
    "ProjectRegistry": {
      "address": "0xREGISTRY_ADDRESS",
      "txHash": "0x..."
    },
    "RewardVault": {
      "address": "0xVAULT_ADDRESS",
      "txHash": "0x..."
    },
    "MockUSDC": {
      "address": "0xUSDC_ADDRESS",
      "txHash": "0x..."
    }
  }
}
```

---

## Troubleshooting

### "Insufficient funds" Error
- Make sure your deployer wallet has enough RON
- Get more from faucet: https://faucet.roninchain.com/

### "Only owner can call" Error
- Check current owner: `cast call <CONTRACT> "owner()(address)" --rpc-url $RPC_URL`
- Make sure you're using the correct private key

### "Pending owner mismatch" Error
- The ownership transfer was initiated but not accepted
- Run `acceptOwnership()` with the Coinbase wallet

### Gas Estimation Failed
- Add `--legacy` flag to use legacy transactions (no EIP-1559)
- Ronin may not support EIP-1559 gas pricing

---

## Next Steps

After successful deployment and ownership transfer:

1. **Update Frontend Configuration**
   - Add contract addresses to `frontend/app/api/agent/contract-configs.ts`
   - Update network to Ronin Saigon

2. **Test Contract Interactions**
   - Register a test user
   - Create a test project
   - Test the complete flow

3. **Monitor Contracts**
   - View on Ronin Explorer: https://saigon-app.roninchain.com
   - Set up event listeners in frontend

4. **Prepare for Mainnet**
   - Audit contracts thoroughly
   - Test extensively on Saigon testnet
   - Follow mainnet deployment checklist in RONIN_DEPLOYMENT_GUIDE.md

---

## Summary Commands

```bash
# Quick reference - run in order:

# 1. Deploy MockUSDC
forge create src/test/MockUSDC.sol:MockUSDC --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --legacy

# 2. Deploy main contracts
forge script script/DeployMain.s.sol:DeployMain --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast --legacy

# 3. Transfer ownership
forge script script/TransferOwnership.s.sol:TransferOwnership --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast --legacy

# 4. Accept ownership (with Coinbase wallet)
cast send <MAIN_ADDRESS> "acceptOwnership()" --rpc-url $RPC_URL --private-key <COINBASE_KEY> --legacy
cast send <REGISTRY_ADDRESS> "acceptOwnership()" --rpc-url $RPC_URL --private-key <COINBASE_KEY> --legacy
cast send <VAULT_ADDRESS> "acceptOwnership()" --rpc-url $RPC_URL --private-key <COINBASE_KEY> --legacy

# 5. Verify
cast call <MAIN_ADDRESS> "owner()(address)" --rpc-url $RPC_URL
```

---

**You're all set!** The contracts are deployed on Ronin Saigon and owned by the Coinbase server wallet.
