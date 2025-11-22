# THE BLOB - Ronin Network Deployment Guide

**Target Network**: Ronin Saigon Testnet → Ronin Mainnet
**Owner Wallet**: `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe` (Coinbase Server Wallet)
**Date**: 2025-11-22

---

## Table of Contents
1. [Ronin Network Overview](#ronin-network-overview)
2. [Network Specifications](#network-specifications)
3. [Deployment Configuration](#deployment-configuration)
4. [Contract Deployment Steps](#contract-deployment-steps)
5. [Frontend Integration](#frontend-integration)
6. [Testing on Ronin Saigon](#testing-on-ronin-saigon)
7. [Mainnet Deployment Strategy](#mainnet-deployment-strategy)

---

## Ronin Network Overview

**Why Ronin?**
- ⚡ **High Performance**: ~3s block times, 100+ TPS
- 💰 **Low Fees**: Simple transfers <0.001 RON (few gwei gas)
- 🎮 **Gaming-Optimized**: Built by Sky Mavis for Web3 gaming
- 🔗 **EVM Compatible**: Full Solidity/Foundry support
- 🏛️ **DPoS Consensus**: 21 validators (11 governing, 10 standard)

---

## Network Specifications

### Ronin Saigon Testnet

| Parameter | Value |
|-----------|-------|
| **Network Name** | Ronin Saigon Testnet |
| **Chain ID** | `2021` |
| **RPC URL** | `https://saigon-testnet.roninchain.com/rpc` |
| **Explorer** | https://saigon-app.roninchain.com |
| **Stats** | https://saigon-stats.roninchain.com |
| **Gas Token** | RON (testnet) |
| **Block Time** | ~3 seconds |
| **Faucet** | https://faucet.roninchain.com/ |
| **Faucet (Alt)** | https://faucets.chain.link/ronin-saigon |

### Ronin Mainnet

| Parameter | Value |
|-----------|-------|
| **Network Name** | Ronin Mainnet |
| **Chain ID** | `2020` |
| **RPC URL** | `https://api.roninchain.com/rpc` |
| **RPC (dRPC)** | `https://ronin.drpc.org` |
| **Explorer** | https://app.roninchain.com |
| **Gas Token** | RON |
| **USDC Contract** | `0x0b7007c13325c48911f73a2dad5fa5dcbf808adc` ⚠️ (Deprecated) |

⚠️ **IMPORTANT NOTE**: The USDC contract on Ronin mainnet is marked as **deprecated**. You may need to:
- Use a different stablecoin (USDT, AXS, etc.)
- Deploy your own ERC20 reward token
- Check if there's a newer USDC deployment

---

## Deployment Configuration

### Step 1: Update Contract Environment Variables

Create/update `contracts/.env.ronin`:

```bash
# Network Configuration
RPC_URL=https://saigon-testnet.roninchain.com/rpc
CHAIN_ID=2021

# Deployment Wallet (Coinbase Server Wallet)
DEPLOYER_PRIVATE_KEY=<your_coinbase_wallet_private_key>
DEPLOYER_ADDRESS=0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe

# Contract Ownership
REGISTRY_OWNER=0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
VAULT_OWNER=0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe

# Asset Configuration
# ⚠️ IMPORTANT: You need to deploy or find a USDC equivalent on Ronin Saigon
# Option 1: Deploy a mock ERC20 for testing
# Option 2: Use existing testnet stablecoin
USDC_ADDRESS=<to_be_deployed_or_found>

# Pricing
REGISTRATION_PRICE=50000000  # 50 USDC (6 decimals)

# Explorer Verification (optional)
ETHERSCAN_API_KEY=  # Not applicable for Ronin
```

### Step 2: Get Testnet RON

Before deploying, you need testnet RON for gas:

1. **Visit Ronin Faucet**: https://faucet.roninchain.com/
2. **Alternative**: https://faucets.chain.link/ronin-saigon
3. **Request RON** for address: `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe`
4. **Wait**: Receive 0.01 RON (enough for multiple deployments)

### Step 3: Deploy or Find USDC Equivalent

Since USDC on Ronin mainnet is deprecated, you have options:

#### Option A: Deploy Mock USDC for Testing
```solidity
// contracts/src/test/MockUSDC.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

Deploy script:
```bash
forge create src/test/MockUSDC.sol:MockUSDC \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

#### Option B: Use Alternative Stablecoin
Check Ronin Saigon explorer for existing ERC20 tokens that could serve as rewards.

---

## Contract Deployment Steps

### Step 1: Compile Contracts
```bash
cd contracts
forge build
```

### Step 2: Dry Run Deployment
```bash
# Load environment variables
source .env.ronin

# Simulate deployment
forge script script/DeployMain.s.sol:DeployMain \
  --rpc-url $RPC_URL \
  --sender $DEPLOYER_ADDRESS
```

### Step 3: Deploy to Ronin Saigon
```bash
# Deploy for real
forge script script/DeployMain.s.sol:DeployMain \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --legacy  # Use legacy transactions if EIP-1559 not supported
```

**Expected Output**:
```
== Logs ==
  Deploying contracts with account: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
  ProjectRegistry deployed at: 0x...
  RewardVault deployed at: 0x...
  Main deployed at: 0x...
```

### Step 4: Save Deployment Addresses

Create `contracts/deployments/ronin-saigon.json`:
```json
{
  "network": "ronin-saigon",
  "chainId": 2021,
  "deployedAt": "2025-11-22T...",
  "deployer": "0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe",
  "contracts": {
    "Main": {
      "address": "0x...",
      "txHash": "0x..."
    },
    "ProjectRegistry": {
      "address": "0x...",
      "txHash": "0x..."
    },
    "RewardVault": {
      "address": "0x...",
      "txHash": "0x..."
    },
    "USDC": {
      "address": "0x...",
      "type": "MockUSDC",
      "txHash": "0x..."
    }
  }
}
```

### Step 5: Verify Ownership
```bash
# Verify Main contract owner
cast call <MAIN_ADDRESS> "owner()(address)" --rpc-url $RPC_URL
# Expected: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe

# Verify Registry owner
cast call <REGISTRY_ADDRESS> "owner()(address)" --rpc-url $RPC_URL
# Expected: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe

# Verify Vault owner
cast call <VAULT_ADDRESS> "owner()(address)" --rpc-url $RPC_URL
# Expected: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
```

### Step 6: Fund Vault with Initial USDC
```bash
# Approve USDC spending
cast send <USDC_ADDRESS> \
  "approve(address,uint256)" \
  <VAULT_ADDRESS> \
  1000000000000 \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Deposit USDC into vault (1M USDC)
cast send <VAULT_ADDRESS> \
  "deposit(uint256,address)" \
  1000000000000 \
  0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

---

## Frontend Integration

### Step 1: Update Network Configuration

Create `frontend/lib/networks/ronin.ts`:
```typescript
export const RONIN_SAIGON = {
  id: 2021,
  name: 'Ronin Saigon Testnet',
  network: 'ronin-saigon',
  nativeCurrency: {
    decimals: 18,
    name: 'RON',
    symbol: 'RON',
  },
  rpcUrls: {
    default: { http: ['https://saigon-testnet.roninchain.com/rpc'] },
    public: { http: ['https://saigon-testnet.roninchain.com/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Ronin Explorer', url: 'https://saigon-app.roninchain.com' },
  },
  testnet: true,
};

export const RONIN_MAINNET = {
  id: 2020,
  name: 'Ronin Mainnet',
  network: 'ronin',
  nativeCurrency: {
    decimals: 18,
    name: 'RON',
    symbol: 'RON',
  },
  rpcUrls: {
    default: { http: ['https://api.roninchain.com/rpc'] },
    public: { http: ['https://ronin.drpc.org'] },
  },
  blockExplorers: {
    default: { name: 'Ronin Explorer', url: 'https://app.roninchain.com' },
  },
  testnet: false,
};
```

### Step 2: Update Contract Addresses

Update `frontend/app/api/agent/contract-configs.ts`:
```typescript
// Ronin Saigon Testnet Deployment
export const RONIN_SAIGON_CONTRACTS = {
  MAIN: "0x...", // From deployment
  REGISTRY: "0x...", // From deployment
  VAULT: "0x...", // From deployment
  USDC: "0x...", // Mock USDC or alternative
};

// Ronin Mainnet (for production)
export const RONIN_MAINNET_CONTRACTS = {
  MAIN: "0x...", // TBD - deploy to mainnet later
  REGISTRY: "0x...",
  VAULT: "0x...",
  USDC: "0x0b7007c13325c48911f73a2dad5fa5dcbf808adc", // ⚠️ Deprecated
};

// Use Saigon for now
export const CONTRACT_ADDRESSES = RONIN_SAIGON_CONTRACTS;
export const CURRENT_NETWORK = RONIN_SAIGON;
```

### Step 3: Update AgentKit Configuration

Update `frontend/app/api/agent/prepare-agentkit.ts`:

**⚠️ IMPORTANT**: Coinbase AgentKit may not natively support Ronin. You'll need to:

#### Option A: Use Viem/Ethers Directly
```typescript
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { RONIN_SAIGON } from '@/lib/networks/ronin';

export async function prepareRoninWallet() {
  const account = privateKeyToAccount(process.env.CDP_WALLET_SECRET as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: RONIN_SAIGON,
    transport: http('https://saigon-testnet.roninchain.com/rpc'),
  });

  return walletClient;
}
```

#### Option B: Add Ronin as Custom Network to AgentKit
```typescript
// This may require custom implementation since AgentKit focuses on Coinbase chains
// You might need to fork or extend AgentKit to support Ronin
```

**Recommendation**: Use **Option A** (Viem) for Ronin integration, as AgentKit is optimized for Base/Ethereum/Polygon.

### Step 4: Create Ronin Contract Actions

Create `frontend/app/api/agent/actions/ronin-blob-actions.ts`:
```typescript
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { RONIN_SAIGON, RONIN_SAIGON_CONTRACTS } from '@/lib/networks/ronin';

const MAIN_ABI = parseAbi([
  'function registerUser() payable',
  'function createProject(bytes32 key, address assignee, uint256 beginDeadline, uint256 endDeadline, uint256 totalReward, address multisig) external',
  'function signProject(bytes32 key) external',
  'function withdrawProjectReward(bytes32 key, address assignee) external',
  'function registeredUsers(address) view returns (bool)',
  'function projectFinalized(bytes32) view returns (bool)',
  'function projectReward(bytes32) view returns (uint256)',
]);

const VAULT_ABI = parseAbi([
  'function totalAssets() view returns (uint256)',
  'function userShares(address) view returns (uint256)',
  'function withdraw(uint256 shares, address receiver) external',
  'function convertToAssets(uint256 shares) view returns (uint256)',
]);

export class RoninBlobContract {
  private publicClient;
  private walletClient;

  constructor() {
    this.publicClient = createPublicClient({
      chain: RONIN_SAIGON,
      transport: http(),
    });

    const account = privateKeyToAccount(process.env.CDP_WALLET_SECRET as `0x${string}`);
    this.walletClient = createWalletClient({
      account,
      chain: RONIN_SAIGON,
      transport: http(),
    });
  }

  async registerUser() {
    const hash = await this.walletClient.writeContract({
      address: RONIN_SAIGON_CONTRACTS.MAIN as `0x${string}`,
      abi: MAIN_ABI,
      functionName: 'registerUser',
      value: 50000000n, // Registration fee
    });

    return hash;
  }

  async createProject(params: {
    key: `0x${string}`;
    assignee: `0x${string}`;
    beginDeadline: number;
    endDeadline: number;
    totalReward: bigint;
    multisig: `0x${string}`;
  }) {
    const hash = await this.walletClient.writeContract({
      address: RONIN_SAIGON_CONTRACTS.MAIN as `0x${string}`,
      abi: MAIN_ABI,
      functionName: 'createProject',
      args: [
        params.key,
        params.assignee,
        BigInt(params.beginDeadline),
        BigInt(params.endDeadline),
        params.totalReward,
        params.multisig,
      ],
    });

    return hash;
  }

  async signProject(key: `0x${string}`) {
    const hash = await this.walletClient.writeContract({
      address: RONIN_SAIGON_CONTRACTS.MAIN as `0x${string}`,
      abi: MAIN_ABI,
      functionName: 'signProject',
      args: [key],
    });

    return hash;
  }

  async getUserShares(address: `0x${string}`) {
    const shares = await this.publicClient.readContract({
      address: RONIN_SAIGON_CONTRACTS.VAULT as `0x${string}`,
      abi: VAULT_ABI,
      functionName: 'userShares',
      args: [address],
    });

    return shares;
  }

  async withdrawReward(key: `0x${string}`, assignee: `0x${string}`) {
    const hash = await this.walletClient.writeContract({
      address: RONIN_SAIGON_CONTRACTS.MAIN as `0x${string}`,
      abi: MAIN_ABI,
      functionName: 'withdrawProjectReward',
      args: [key, assignee],
    });

    return hash;
  }
}
```

### Step 5: Update Environment Variables

Update `frontend/.env`:
```bash
# Network Configuration
NEXT_PUBLIC_NETWORK_ID=ronin-saigon
NEXT_PUBLIC_CHAIN_ID=2021
NEXT_PUBLIC_RPC_URL=https://saigon-testnet.roninchain.com/rpc

# Contract Addresses (from deployment)
NEXT_PUBLIC_MAIN_CONTRACT=0x...
NEXT_PUBLIC_VAULT_CONTRACT=0x...
NEXT_PUBLIC_REGISTRY_CONTRACT=0x...
NEXT_PUBLIC_USDC_CONTRACT=0x...

# Coinbase Wallet (Server Signing)
CDP_WALLET_SECRET=<coinbase_wallet_private_key>

# AI APIs (unchanged)
OPENAI_API_KEY=...
GROK_API_KEY=...
GOOGLE_API_KEY=...

# Supabase (unchanged)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Testing on Ronin Saigon

### Test Checklist

#### ✅ Contract Deployment
- [ ] All contracts deployed to Ronin Saigon
- [ ] Ownership verified (Coinbase wallet)
- [ ] Vault funded with initial USDC/mock token
- [ ] Transactions visible on https://saigon-app.roninchain.com

#### ✅ User Registration
- [ ] User can register onchain
- [ ] Registration fee paid in RON
- [ ] User marked as registered in Main contract
- [ ] User profile created in Supabase

#### ✅ Project Creation
- [ ] Project created in Supabase with contract_key
- [ ] Project created onchain via Main.createProject()
- [ ] ProjectData contract deployed
- [ ] Multisig contract deployed and registered

#### ✅ Work Submission & Approval
- [ ] User submits work
- [ ] AI council evaluates (3 judges)
- [ ] Approved judges sign onchain via server wallet
- [ ] After 4/4 approval, project finalizes automatically
- [ ] Reward shares allocated to assignee

#### ✅ Reward Withdrawal
- [ ] User withdraws project reward
- [ ] Shares transferred to user
- [ ] User redeems shares for USDC
- [ ] USDC balance increases correctly

---

## Mainnet Deployment Strategy

### Prerequisites for Mainnet

1. **Audit Smart Contracts**
   - Security review of all contracts
   - Fix any vulnerabilities
   - Test thoroughly on Saigon testnet

2. **Resolve USDC Issue**
   - ⚠️ Ronin mainnet USDC is deprecated
   - Options:
     - Deploy your own reward token (ERC20)
     - Use AXS, SLP, or other Ronin-native tokens
     - Partner with stablecoin provider for new deployment

3. **Funding**
   - Acquire RON for mainnet gas fees
   - Acquire reward tokens to fund vault

### Mainnet Deployment Steps

1. **Update Configuration**
   ```bash
   # In contracts/.env.ronin.mainnet
   RPC_URL=https://api.roninchain.com/rpc
   CHAIN_ID=2020
   # ... other mainnet values
   ```

2. **Deploy Contracts**
   ```bash
   forge script script/DeployMain.s.sol:DeployMain \
     --rpc-url https://api.roninchain.com/rpc \
     --private-key $DEPLOYER_PRIVATE_KEY \
     --broadcast \
     --legacy
   ```

3. **Verify on Explorer**
   - Check https://app.roninchain.com
   - Verify contract ownership
   - Verify initial funding

4. **Update Frontend**
   - Switch to mainnet contract addresses
   - Update RPC URL
   - Enable mainnet in UI

5. **Monitor & Test**
   - Test with small amounts first
   - Monitor gas costs
   - Verify all flows work correctly

---

## Appendix: Useful Commands

### Check RON Balance
```bash
cast balance 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe \
  --rpc-url https://saigon-testnet.roninchain.com/rpc
```

### Get Latest Block
```bash
cast block-number --rpc-url https://saigon-testnet.roninchain.com/rpc
```

### Call Contract (Read)
```bash
cast call <CONTRACT_ADDRESS> \
  "functionName()(returnType)" \
  --rpc-url https://saigon-testnet.roninchain.com/rpc
```

### Send Transaction (Write)
```bash
cast send <CONTRACT_ADDRESS> \
  "functionName(argType)" \
  <arg_value> \
  --rpc-url https://saigon-testnet.roninchain.com/rpc \
  --private-key $DEPLOYER_PRIVATE_KEY
```

---

## Sources

- [Ronin Saigon Testnet Specifications](https://docs.roninchain.com/developers/network/)
- [Ronin RPC Documentation](https://docs.skymavis.com/ronin/rpc/overview)
- [Ronin Testnet Faucet](https://faucet.roninchain.com/)
- [Chainlink Ronin Faucet](https://faucets.chain.link/ronin-saigon)
- [Ronin Mainnet USDC Contract](https://app.roninchain.com/token/0x0b7007c13325c48911f73a2dad5fa5dcbf808adc)
- [Saigon Testnet on Thirdweb](https://thirdweb.com/saigon-testnet)

---

**Next Steps**: Deploy contracts to Ronin Saigon testnet and test complete user journey!
