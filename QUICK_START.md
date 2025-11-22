# THE BLOB - Quick Start Guide

**Network**: Ronin Saigon Testnet
**Final Owner**: `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe`

---

## What's Done ✅

1. **Contracts Modified for Ownership Transfer**
   - All contracts now use OpenZeppelin's `Ownable` pattern
   - Ownership can be transferred using `transferOwnership()` and `acceptOwnership()`

2. **Database Schema Simplified**
   - Removed redundant tables and columns
   - Only stores data that can't be derived from smart contracts
   - Clean migration SQL ready to run

3. **Deployment Documentation Created**
   - Complete Ronin Saigon deployment guide
   - Ownership transfer instructions
   - Step-by-step testing checklist

---

## Next Steps (What You Need to Do)

### 1. Get Testnet RON
```bash
# Visit: https://faucet.roninchain.com/
# Request RON for your deployment wallet
```

### 2. Configure Environment
```bash
# Edit contracts/.env.ronin.saigon
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
DEPLOYER_ADDRESS=0xYOUR_ADDRESS
```

### 3. Deploy MockUSDC
```bash
cd contracts
forge create src/test/MockUSDC.sol:MockUSDC \
  --rpc-url https://saigon-testnet.roninchain.com/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --legacy

# Update USDC_ADDRESS in .env.ronin.saigon with deployed address
```

### 4. Deploy Main Contracts
```bash
forge script script/DeployMain.s.sol:DeployMain \
  --rpc-url https://saigon-testnet.roninchain.com/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --legacy

# Save the deployed addresses (Main, Registry, Vault)
```

### 5. Transfer Ownership
```bash
# Add addresses to .env.ronin.saigon:
# MAIN_ADDRESS=0x...
# REGISTRY_ADDRESS=0x...
# VAULT_ADDRESS=0x...

forge script script/TransferOwnership.s.sol:TransferOwnership \
  --rpc-url https://saigon-testnet.roninchain.com/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --legacy
```

### 6. Accept Ownership (with Coinbase Wallet)
```bash
# Using Coinbase wallet private key:
cast send $MAIN_ADDRESS "acceptOwnership()" \
  --rpc-url https://saigon-testnet.roninchain.com/rpc \
  --private-key <COINBASE_WALLET_KEY> \
  --legacy
```

### 7. Verify Ownership
```bash
cast call $MAIN_ADDRESS "owner()(address)" \
  --rpc-url https://saigon-testnet.roninchain.com/rpc
# Should return: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
```

---

**You're all set!** Follow the steps above for full deployment.
