# THE BLOB - Smart Contract Integration Guide

**Date**: 2025-11-22
**Target Wallet**: `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe` (Coinbase Server Wallet)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Critical Issues Identified](#critical-issues-identified)
4. [Database Schema Simplification](#database-schema-simplification)
5. [Integration Plan](#integration-plan)
6. [Ownership Transfer Instructions](#ownership-transfer-instructions)
7. [Testing & Verification](#testing--verification)

---

## Executive Summary

This guide outlines the complete integration strategy for connecting THE BLOB's smart contracts (deployed on Ethereum Sepolia) with the Next.js frontend (currently configured for Base Sepolia) and Supabase database.

**Key Actions Required**:
1. **Resolve Network Mismatch** - Frontend expects Base Sepolia, contracts are on Ethereum Sepolia
2. **Simplify Database Schema** - Current schema is over-engineered for actual onchain data
3. **Transfer Contract Ownership** - Move control to Coinbase server wallet
4. **Wire Up Contract Interactions** - Connect frontend to smart contracts via AgentKit
5. **Implement End-to-End Payment Flow** - Complete user registration → job assignment → approval → payout

---

## Current Architecture Analysis

### Smart Contracts (Ethereum Sepolia - Chain ID: 11155111)

| Contract | Address | Owner | Purpose |
|----------|---------|-------|---------|
| **Main** | `0x269b63587235081bfa86a1066de9e5bc25a49444` | Deployer | Orchestrates user registration, project creation, multisig approvals |
| **ProjectRegistry** | `0x6ba2565b6ccd2a51730628b8d79b575dce3ebf6c` | Deployer | Factory for ProjectData contracts |
| **RewardVault** | `0x9050d8ca627dc080881dfe14537675602cd06955` | Deployer | ERC4626 vault for USDC reward distribution |

**External Dependencies**:
- USDC (Sepolia): `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

### Frontend Configuration (Base Sepolia - Chain ID: 84532)

**Current Issues**:
- AgentKit configured for Base Sepolia
- USDC contract referenced: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia)
- **MISMATCH**: Contracts deployed on Ethereum Sepolia but frontend expects Base Sepolia

### Database Schema (Supabase/Neon Postgres)

**Current Tables**:
1. `users` - User profiles with wallet addresses
2. `projects` - Job listings with status tracking
3. `council_votes` - AI judge evaluations
4. `referrals` - Referral tree structure
5. `treasury` - ⚠️ **REDUNDANT** (duplicates onchain RewardVault data)
6. `sentiment_data` - Social media sentiment
7. `chat_messages` - Conversation history

**Onchain Data vs Offchain**:
```
┌─────────────────────────────────────────────────────────────┐
│                   DATA DISTRIBUTION                          │
├─────────────────────────────────────────────────────────────┤
│ ONCHAIN (Smart Contracts)         OFFCHAIN (Supabase)      │
├───────────────────────────────────┬─────────────────────────┤
│ • User registration status        │ • Username              │
│ • Registration fee payment        │ • Skills/interview      │
│ • Project assignee address        │ • Project descriptions  │
│ • Project deadlines               │ • Submission URLs       │
│ • Project reward amounts          │ • AI vote reasoning     │
│ • Multisig approvals (4-of-4)     │ • Chat history          │
│ • Project finalization status     │ • Social sentiment      │
│ • Reward share allocation         │                         │
│ • Vault balance (USDC)            │                         │
└───────────────────────────────────┴─────────────────────────┘
```

---

## Critical Issues Identified

### 🔴 Issue 1: Network Mismatch
**Problem**: Contracts on Ethereum Sepolia, frontend expects Base Sepolia
**Impact**: Cannot interact with contracts
**Solutions**:
- **Option A (Recommended)**: Redeploy contracts to Base Sepolia
  - ✅ Matches frontend configuration
  - ✅ Lower gas costs on Base
  - ✅ Coinbase ecosystem alignment
  - ❌ Requires new deployment
- **Option B**: Reconfigure frontend for Ethereum Sepolia
  - ✅ Uses existing contracts
  - ❌ Misaligned with Coinbase AgentKit's primary network
  - ❌ Higher gas costs

**Recommendation**: **Option A** - Redeploy to Base Sepolia for better ecosystem fit

### 🟡 Issue 2: Over-Engineered Database Schema
**Problem**: Database tracks data that should be derived from onchain events
**Impact**: Data synchronization challenges, maintenance overhead
**Examples**:
- `users.total_earned` - Should query `RewardVault.userShares`
- `users.jobs_completed` - Should count finalized projects onchain
- `users.reputation_score` - Should be calculated from onchain approval rate
- `treasury.total_balance` - Should query `RewardVault.totalAssets()`

**Recommendation**: Simplify schema (see Section 4)

### 🟡 Issue 3: No Contract Integration in Frontend
**Problem**: Frontend has AgentKit but doesn't call Main/Registry/Vault contracts
**Impact**: All operations are DB-only, no real payments happen
**Solution**: Add contract interaction tools to AgentKit (see Section 5)

### 🟡 Issue 4: Wallet Connection Mocked
**Problem**: Onboarding simulates wallet connection
**Impact**: No real user wallets connected, can't sign transactions
**Solution**: Implement real wallet connection flow

### 🔴 Issue 5: AI Council ≠ Onchain Multisig
**Problem**: AI judges vote in Supabase, but onchain requires 4-of-4 multisig
**Impact**: Disconnect between AI decisions and payment execution
**Solution**: Map AI council to multisig participants (see Section 5.4)

---

## Database Schema Simplification

### Recommended Simplified Schema

#### ✅ **users** (Keep - Simplified)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  skills JSONB, -- Interview responses
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remove: total_earned, jobs_completed, reputation_score
-- Reason: These should be derived from onchain data via contract queries
```

#### ✅ **projects** (Keep - Simplified)
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_key TEXT UNIQUE NOT NULL, -- Maps to onchain project key
  assignee_address TEXT REFERENCES users(wallet_address),
  title TEXT NOT NULL,
  description TEXT,
  submission_url TEXT,
  submission_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Remove: status, price_estimate, deadline_start, deadline_end
-- Reason: These are stored onchain in ProjectData contracts
-- To get status: Query Main.projectFinalized[key] and ProjectData.status
-- To get deadlines: Query ProjectData.project.beginDeadline/endDeadline
-- To get reward: Query ProjectData.project.totalReward
```

#### ✅ **council_votes** (Keep - AI-Specific Data)
```sql
CREATE TABLE council_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  judge_id TEXT NOT NULL, -- 'judge1', 'judge2', 'judge3'
  judge_name TEXT, -- 'VALIDATOR-PRIME', etc.
  vote BOOLEAN NOT NULL,
  reason TEXT, -- AI reasoning
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Keep: This stores AI-specific data not available onchain
```

#### ✅ **chat_messages** (Keep - UX Enhancement)
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT REFERENCES users(wallet_address),
  role TEXT NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keep: Useful for conversation history, not available onchain
```

#### ❌ **treasury** (Remove - Fully Onchain)
```sql
-- DELETE THIS TABLE
-- Reason: All treasury data is available via RewardVault contract:
--   - total_balance → RewardVault.totalAssets()
--   - joining_fee → Main contract or can be updated via setRegistrationPrice
```

#### 🟡 **referrals** (Optional - Consider Onchain)
```sql
-- Consider moving to smart contract if referral rewards will be paid onchain
-- If keeping offchain for analytics only, keep as-is
```

#### 🟡 **sentiment_data** (Optional - Low Priority)
```sql
-- Keep if social sentiment is used for dynamic pricing/job assignment
-- Remove if not actively used in decision-making
```

---

## Integration Plan

### Phase 1: Network Alignment & Contract Deployment

#### Step 1.1: Choose Target Network
**Decision Required**: Ethereum Sepolia (current) or Base Sepolia (frontend)?

**If choosing Base Sepolia (recommended)**:
1. Update deployment scripts:
   ```bash
   # In contracts/.env
   RPC_URL=https://sepolia.base.org
   CHAIN_ID=84532
   USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e # Base Sepolia USDC
   ```

2. Redeploy contracts:
   ```bash
   cd contracts
   forge script script/DeployMain.s.sol:DeployMain --rpc-url $RPC_URL --broadcast --verify
   ```

3. Update frontend with new addresses:
   ```typescript
   // frontend/app/api/agent/contract-configs.ts
   export const MAIN_CONTRACT_ADDRESS = "0x..." // New Main address
   export const REGISTRY_ADDRESS = "0x..." // New Registry address
   export const VAULT_ADDRESS = "0x..." // New Vault address
   ```

**If keeping Ethereum Sepolia**:
1. Update frontend network configuration:
   ```typescript
   // frontend/app/api/agent/prepare-agentkit.ts
   const wallet = await CdpSmartWalletProvider.configureWithWallet({
     networkId: "ethereum-sepolia", // Change from "base-sepolia"
   });
   ```

2. Update USDC address in frontend:
   ```typescript
   USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" // Sepolia USDC
   ```

---

### Phase 2: Transfer Contract Ownership

**Target Owner**: `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe` (Coinbase Server Wallet)

#### Step 2.1: Create Ownership Transfer Script
```solidity
// contracts/script/TransferOwnership.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/Main.sol";
import "../src/ProjectRegistry.sol";
import "../src/RewardVault.sol";

contract TransferOwnership is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address newOwner = 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe;

        vm.startBroadcast(deployerPrivateKey);

        // Note: These contracts use immutable owner, so transfer is not possible!
        // We need to redeploy with the Coinbase wallet as the owner from the start

        vm.stopBroadcast();
    }
}
```

⚠️ **CRITICAL ISSUE DISCOVERED**: The contracts use **immutable** `owner` variables set in constructors. Ownership cannot be transferred post-deployment!

**Solutions**:
- **Option A**: Redeploy contracts with Coinbase wallet as owner from the start
- **Option B**: Modify contracts to use transferable ownership (OpenZeppelin Ownable)

**Recommended Approach**: **Option A** - Redeploy with correct owner

#### Step 2.2: Redeploy with Correct Owner
```bash
# In contracts/.env, add:
DEPLOYER_PRIVATE_KEY=<coinbase_wallet_private_key>
DEPLOYER_ADDRESS=0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
REGISTRY_OWNER=0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
VAULT_OWNER=0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe

# Deploy
forge script script/DeployMain.s.sol:DeployMain --rpc-url $RPC_URL --broadcast
```

---

### Phase 3: Frontend Contract Integration

#### Step 3.1: Add Contract ABIs to Frontend
```typescript
// frontend/app/api/agent/abis.ts
export const MAIN_ABI = [
  "function registerUser() payable",
  "function createProject(bytes32 key, address assignee, uint256 beginDeadline, uint256 endDeadline, uint256 totalReward, address multisig) external",
  "function signProject(bytes32 key) external",
  "function withdrawProjectReward(bytes32 key, address assignee) external",
  "function registeredUsers(address) view returns (bool)",
  "function projectFinalized(bytes32) view returns (bool)",
  "function projectReward(bytes32) view returns (uint256)",
] as const;

export const VAULT_ABI = [
  "function totalAssets() view returns (uint256)",
  "function userShares(address) view returns (uint256)",
  "function withdraw(uint256 shares, address receiver) external",
  "function convertToAssets(uint256 shares) view returns (uint256)",
] as const;

export const PROJECT_REGISTRY_ABI = [
  "function projects(bytes32) view returns (address projectData)",
] as const;

export const PROJECT_DATA_ABI = [
  "function project() view returns (address assignee, uint256 createdAt, uint256 beginDeadline, uint256 endDeadline, uint256 totalReward, string dbId, uint8 status)",
  "function evaluatePayment(uint256 timestamp) view returns (uint256)",
] as const;
```

#### Step 3.2: Create Smart Contract Action Provider
```typescript
// frontend/app/api/agent/actions/blob-contract-actions.ts
import { EvmSmartContractTool } from "@coinbase/agentkit-core";
import { MAIN_ABI, VAULT_ABI } from "../abis";

export const MAIN_CONTRACT_ADDRESS = "0x269b63587235081bfa86a1066de9e5bc25a49444"; // Update after redeployment
export const VAULT_CONTRACT_ADDRESS = "0x9050d8ca627dc080881dfe14537675602cd06955"; // Update after redeployment

export function blobContractActionProvider() {
  return {
    name: "blob_contracts",
    description: "Interact with The Blob smart contracts for user registration, project management, and reward distribution",

    tools: [
      // Main Contract Tools
      new EvmSmartContractTool({
        contractAddress: MAIN_CONTRACT_ADDRESS,
        abi: MAIN_ABI,
        functionName: "registerUser",
        description: "Register a user and pay registration fee",
      }),

      new EvmSmartContractTool({
        contractAddress: MAIN_CONTRACT_ADDRESS,
        abi: MAIN_ABI,
        functionName: "createProject",
        description: "Create a new project onchain with assignee, deadlines, and reward amount",
      }),

      new EvmSmartContractTool({
        contractAddress: MAIN_CONTRACT_ADDRESS,
        abi: MAIN_ABI,
        functionName: "signProject",
        description: "Sign/approve a project (requires 4-of-4 multisig)",
      }),

      new EvmSmartContractTool({
        contractAddress: MAIN_CONTRACT_ADDRESS,
        abi: MAIN_ABI,
        functionName: "withdrawProjectReward",
        description: "Withdraw finalized project rewards",
      }),

      // Vault Tools
      new EvmSmartContractTool({
        contractAddress: VAULT_CONTRACT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "withdraw",
        description: "Withdraw USDC rewards from vault using earned shares",
      }),

      new EvmSmartContractTool({
        contractAddress: VAULT_CONTRACT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "userShares",
        description: "Check user's reward share balance",
      }),

      new EvmSmartContractTool({
        contractAddress: VAULT_CONTRACT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "totalAssets",
        description: "Get total USDC balance in vault",
      }),
    ],
  };
}
```

#### Step 3.3: Register Action Provider with Agent
```typescript
// frontend/app/api/agent/prepare-agentkit.ts
import { blobContractActionProvider } from "./actions/blob-contract-actions";

export async function prepareAgentkit() {
  // ... existing wallet setup ...

  const actionProviders = [
    walletActionProvider(),
    erc20ActionProvider(),
    blobContractActionProvider(), // ← Add this
    // ... other providers
  ];

  const coinbaseAgent = await createCdpAgent({
    wallet,
    actionProviders,
  });

  return coinbaseAgent;
}
```

---

### Phase 4: End-to-End Flow Implementation

#### Flow 1: User Registration

**Current**: Mocked wallet + Supabase insert
**Target**: Real wallet connection + onchain registration

```typescript
// frontend/app/components/OnboardingFlow.tsx
const handleDeposit = async () => {
  try {
    // Step 1: Create real wallet (instead of mock)
    const response = await fetch('/api/wallet/create', {
      method: 'POST',
    });
    const { walletAddress } = await response.json();

    setWalletAddress(walletAddress);
    setWalletConnected(true);

    // Step 2: Register onchain (via agent)
    const registerResponse = await fetch('/api/agent', {
      method: 'POST',
      body: JSON.stringify({
        userMessage: `Register user ${walletAddress} onchain by calling Main.registerUser()`,
      }),
    });

    // Step 3: Create Supabase profile
    await supabase.from('users').insert({
      wallet_address: walletAddress,
      username: userData.username,
    });

    setStep('interview');
  } catch (error) {
    console.error('Registration failed:', error);
  }
};
```

#### Flow 2: Project Creation

**Integration Point**: When agent creates a job, also create it onchain

```typescript
// In agent message handler
async function handleJobCreation(projectData) {
  // Step 1: Generate unique project key
  const projectKey = ethers.utils.id(`project_${Date.now()}`);

  // Step 2: Create in Supabase (offchain metadata)
  const { data: project } = await supabase
    .from('projects')
    .insert({
      contract_key: projectKey,
      assignee_address: projectData.assignee,
      title: projectData.title,
      description: projectData.description,
    })
    .select()
    .single();

  // Step 3: Create onchain (via agent tool call)
  await agent.createProject({
    key: projectKey,
    assignee: projectData.assignee,
    beginDeadline: Math.floor(Date.now() / 1000) + 7 * 86400, // 7 days
    endDeadline: Math.floor(Date.now() / 1000) + 14 * 86400, // 14 days
    totalReward: ethers.utils.parseUnits("100", 6), // 100 USDC
    multisig: multisigAddress, // Deploy CallConfirmation4of4 first
  });

  return project;
}
```

#### Flow 3: Work Submission & AI Council → Multisig Approval

**Challenge**: Map AI council (3 judges) to onchain multisig (4-of-4)

**Proposed Solution**:
```
Multisig Participants:
1. Assignee (worker) - Auto-approves when they submit work
2. Judge 1 (VALIDATOR-PRIME) - Controlled by server wallet
3. Judge 2 (CHAOS-ARBITER) - Controlled by server wallet
4. Judge 3 (IMPACT-SAGE) - Controlled by server wallet

Approval Logic:
- Worker submits → Calls Main.signProject() with their wallet
- Each AI judge votes → Server wallet calls Main.signProject() on behalf of judge
- When 4/4 approve → Main._finalizeProject() executes automatically
- Reward shares allocated to assignee
```

**Implementation**:
```typescript
// frontend/app/api/council/sign-onchain/route.ts
export async function POST(request: Request) {
  const { projectKey, judgeId, approved } = await request.json();

  if (!approved) {
    // If judge rejects, don't sign onchain
    return Response.json({ success: false, reason: "Judge rejected" });
  }

  // Get judge wallet address (pre-configured)
  const judgeWallets = {
    judge1: process.env.JUDGE1_WALLET_ADDRESS,
    judge2: process.env.JUDGE2_WALLET_ADDRESS,
    judge3: process.env.JUDGE3_WALLET_ADDRESS,
  };

  const judgeAddress = judgeWallets[judgeId];

  // Call Main.signProject() via AgentKit
  const agent = await prepareAgentkit();
  await agent.invokeAction("write_contract", {
    contractAddress: MAIN_CONTRACT_ADDRESS,
    abi: MAIN_ABI,
    functionName: "signProject",
    args: [projectKey],
    // This will sign with the server wallet representing this judge
  });

  return Response.json({ success: true });
}
```

#### Flow 4: Reward Withdrawal

**User Action**: Click "Withdraw Rewards" button

```typescript
// frontend/app/components/RewardsDashboard.tsx
const handleWithdraw = async () => {
  // Step 1: Get finalized projects for this user
  const { data: projects } = await supabase
    .from('projects')
    .select('contract_key')
    .eq('assignee_address', userAddress);

  // Step 2: Withdraw from Main contract (transfers shares to user)
  for (const project of projects) {
    await fetch('/api/agent', {
      method: 'POST',
      body: JSON.stringify({
        userMessage: `Withdraw project reward for key ${project.contract_key} to ${userAddress}`,
      }),
    });
  }

  // Step 3: Redeem shares from vault
  const userShares = await vaultContract.userShares(userAddress);
  await fetch('/api/agent', {
    method: 'POST',
    body: JSON.stringify({
      userMessage: `Withdraw ${userShares} shares from RewardVault to ${userAddress}`,
    }),
  });
};
```

---

### Phase 5: Database Migration

#### Step 5.1: Create Migration Script
```sql
-- migrations/001_simplify_schema.sql

-- Remove redundant columns from users
ALTER TABLE users
  DROP COLUMN IF EXISTS total_earned,
  DROP COLUMN IF EXISTS jobs_completed,
  DROP COLUMN IF EXISTS reputation_score;

-- Remove redundant columns from projects
ALTER TABLE projects
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS price_estimate,
  DROP COLUMN IF EXISTS deadline_start,
  DROP COLUMN IF EXISTS deadline_end;

-- Add contract_key if not exists
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS contract_key TEXT UNIQUE;

-- Drop treasury table
DROP TABLE IF EXISTS treasury;

-- Optional: Drop referrals if not using
-- DROP TABLE IF EXISTS referrals;

-- Optional: Drop sentiment_data if not using
-- DROP TABLE IF EXISTS sentiment_data;
```

#### Step 5.2: Create View for Derived Data
```sql
-- Create view to calculate stats from events (implement after indexing setup)
CREATE OR REPLACE VIEW user_stats AS
SELECT
  wallet_address,
  -- These would be calculated from indexed onchain events:
  0 as total_earned, -- Query RewardVault.userShares + convertToAssets
  0 as jobs_completed, -- Count finalized projects
  0.0 as reputation_score -- Calculate from approval rate
FROM users;
```

---

## Ownership Transfer Instructions

### Prerequisites
1. Coinbase server wallet private key access
2. Deployer wallet has sufficient ETH/USDC for deployment
3. Network RPC URL configured

### Step-by-Step Transfer Process

Since contracts use **immutable ownership**, we must **redeploy** with the Coinbase wallet as owner.

#### Step 1: Configure Deployment Environment
```bash
# In contracts/.env
DEPLOYER_PRIVATE_KEY=<coinbase_wallet_private_key>
DEPLOYER_ADDRESS=0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
REGISTRY_OWNER=0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
VAULT_OWNER=0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
RPC_URL=<network_rpc_url>
CHAIN_ID=<chain_id>
USDC_ADDRESS=<usdc_contract_address>
REGISTRATION_PRICE=50000000
```

#### Step 2: Deploy with Correct Owner
```bash
cd contracts

# Compile contracts
forge build

# Deploy (dry run first)
forge script script/DeployMain.s.sol:DeployMain \
  --rpc-url $RPC_URL \
  --sender $DEPLOYER_ADDRESS

# Deploy for real
forge script script/DeployMain.s.sol:DeployMain \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify # Optional: verify on Etherscan
```

#### Step 3: Save Deployed Addresses
```bash
# Output will show:
# ProjectRegistry deployed at: 0x...
# RewardVault deployed at: 0x...
# Main deployed at: 0x...

# Save these to frontend configuration
```

#### Step 4: Update Frontend Configuration
```typescript
// frontend/app/api/agent/contract-configs.ts
export const CONTRACT_ADDRESSES = {
  MAIN: "0x...", // New Main address
  REGISTRY: "0x...", // New Registry address
  VAULT: "0x...", // New Vault address
  USDC: "0x...", // USDC address for the network
};
```

#### Step 5: Verify Ownership
```bash
# Use cast to verify owner
cast call <MAIN_ADDRESS> "owner()(address)" --rpc-url $RPC_URL
# Should return: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe

cast call <REGISTRY_ADDRESS> "owner()(address)" --rpc-url $RPC_URL
# Should return: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe

cast call <VAULT_ADDRESS> "owner()(address)" --rpc-url $RPC_URL
# Should return: 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
```

#### Step 6: Fund Vault with Initial USDC
```bash
# Approve USDC spending
cast send <USDC_ADDRESS> \
  "approve(address,uint256)" \
  <VAULT_ADDRESS> \
  <amount> \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Deposit USDC into vault
cast send <VAULT_ADDRESS> \
  "deposit(uint256,address)" \
  <amount> \
  <VAULT_OWNER_ADDRESS> \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

---

## Testing & Verification

### Manual Testing Checklist

#### ✅ Contract Deployment Verification
- [ ] Main contract deployed and verified
- [ ] ProjectRegistry deployed and verified
- [ ] RewardVault deployed and verified
- [ ] All contracts have correct owner (`0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe`)
- [ ] Vault initialized with USDC asset
- [ ] Vault has initial USDC deposit

#### ✅ Frontend Integration Testing
- [ ] Frontend connects to correct network
- [ ] Contract addresses configured correctly
- [ ] Agent can read contract data (view functions)
- [ ] Agent can write to contracts (state-changing functions)

#### ✅ User Registration Flow
- [ ] User can connect wallet (real, not mocked)
- [ ] User can pay registration fee onchain
- [ ] `Main.registeredUsers[user]` returns true
- [ ] User profile created in Supabase
- [ ] Registration fee sent to owner

#### ✅ Project Creation Flow
- [ ] Agent creates project in Supabase with `contract_key`
- [ ] Agent calls `Main.createProject()` onchain
- [ ] ProjectData contract deployed via ProjectRegistry
- [ ] CallConfirmation4of4 deployed and registered
- [ ] Project data queryable from both DB and contract

#### ✅ Work Submission & Approval Flow
- [ ] User submits work URL in UI
- [ ] Assignee calls `Main.signProject()` (1/4)
- [ ] AI council evaluates work
- [ ] Each approved judge signs onchain via server wallet (2/4, 3/4, 4/4)
- [ ] After 4/4, `Main._finalizeProject()` executes automatically
- [ ] `projectFinalized[key]` returns true
- [ ] `projectReward[key]` has correct share amount
- [ ] ProjectData status set to "Done"

#### ✅ Reward Withdrawal Flow
- [ ] Assignee calls `Main.withdrawProjectReward()`
- [ ] Shares transferred from `unallocatedShares` to `userShares[assignee]`
- [ ] User calls `RewardVault.withdraw()`
- [ ] USDC transferred to user wallet
- [ ] User balance increases correctly

#### ✅ Database Simplification
- [ ] Removed `treasury` table
- [ ] Removed redundant columns from `users`
- [ ] Removed redundant columns from `projects`
- [ ] Stats calculated from onchain data (not stored in DB)

### Automated Testing

#### Unit Tests (Foundry)
```bash
cd contracts
forge test -vvv
```

Expected coverage:
- Main.sol: User registration, project creation, multisig flow, finalization
- RewardVault.sol: Deposit, withdraw, share conversion
- ProjectData.sol: Payment evaluation logic
- CallConfirmation4of4.sol: Approval counting

#### Integration Tests (Frontend)
```typescript
// tests/integration/complete-flow.test.ts
describe('Complete User Journey', () => {
  it('should complete full flow: register → job → submit → approve → withdraw', async () => {
    // 1. Register user
    // 2. Create project
    // 3. Submit work
    // 4. AI council approves
    // 5. Withdraw rewards
    // 6. Verify balances
  });
});
```

---

## Appendices

### Appendix A: Network Configuration Reference

| Network | Chain ID | RPC URL | USDC Address |
|---------|----------|---------|--------------|
| **Ethereum Sepolia** | 11155111 | https://sepolia.drpc.org | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| **Base Sepolia** | 84532 | https://sepolia.base.org | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

### Appendix B: Environment Variables Checklist

**Smart Contracts** (`contracts/.env`):
```bash
RPC_URL=
CHAIN_ID=
DEPLOYER_PRIVATE_KEY=
DEPLOYER_ADDRESS=
REGISTRY_OWNER=0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
VAULT_OWNER=0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
USDC_ADDRESS=
REGISTRATION_PRICE=50000000
```

**Frontend** (`frontend/.env`):
```bash
# AI APIs
OPENAI_API_KEY=
GROK_API_KEY=
GOOGLE_API_KEY=

# Coinbase CDP
CDP_API_KEY_ID=
CDP_API_KEY_SECRET=
CDP_WALLET_SECRET=
NETWORK_ID=base-sepolia # or ethereum-sepolia

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Contract Addresses (update after deployment)
NEXT_PUBLIC_MAIN_CONTRACT=
NEXT_PUBLIC_VAULT_CONTRACT=
NEXT_PUBLIC_REGISTRY_CONTRACT=
NEXT_PUBLIC_USDC_CONTRACT=

# Judge Wallets (for multisig signing)
JUDGE1_WALLET_ADDRESS=
JUDGE2_WALLET_ADDRESS=
JUDGE3_WALLET_ADDRESS=
```

### Appendix C: Gas Estimation

**Registration**: ~50,000 gas
**Create Project**: ~500,000 gas (deploys 2 contracts)
**Sign Project**: ~100,000 gas
**Finalize Project**: ~200,000 gas
**Withdraw Reward**: ~150,000 gas

**Total per project cycle**: ~1,000,000 gas (~$5-20 depending on network)

---

## Summary

This integration guide provides a complete roadmap for:
1. ✅ Resolving the network mismatch between contracts and frontend
2. ✅ Simplifying the over-engineered database schema
3. ✅ Transferring contract ownership to the Coinbase server wallet
4. ✅ Wiring up full end-to-end payment flows
5. ✅ Mapping AI council decisions to onchain multisig approvals

**Critical Next Steps**:
1. **Decide on network**: Base Sepolia (recommended) or Ethereum Sepolia
2. **Redeploy contracts** with Coinbase wallet as owner
3. **Update frontend** with new contract addresses
4. **Implement contract action providers** in AgentKit
5. **Test complete user journey** end-to-end
6. **Migrate database schema** to simplified version

**Estimated Timeline**:
- Phase 1 (Network + Deployment): 1-2 days
- Phase 2 (Ownership Transfer): Same as Phase 1 (redeployment)
- Phase 3 (Frontend Integration): 2-3 days
- Phase 4 (Flow Implementation): 3-5 days
- Phase 5 (DB Migration): 1 day
- Testing & Refinement: 2-3 days

**Total**: 7-14 days for full integration

---

**Document Version**: 1.0
**Last Updated**: 2025-11-22
**Contact**: Integration Team
