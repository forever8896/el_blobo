# AI Council → Onchain Multisig Integration

## Current Architecture

### AI Council (Frontend)
- **3 AI Judges**: VALIDATOR-PRIME (OpenAI), IMPACT-SAGE (Gemini), CHAOS-ARBITER (Grok)
- **Voting**: Each judge votes approve/reject
- **Decision**: Majority vote (2/3 required)
- **Storage**: Votes stored in Supabase `council_votes` table

### Onchain Multisig (Smart Contract)
- **4-of-4 Multisig**: Requires ALL 4 participants to approve
- **Participants**: 1 Assignee + 3 Committee members
- **Contract**: `CallConfirmation4of4.sol`
- **Approval**: Each participant calls `approve(callId)`
- **Finalization**: When 4/4 approve, project gets finalized and paid

---

## The Problem

**AI Council** = 3 judges (majority vote)
**Onchain Multisig** = 4 participants (unanimous vote)

How do we bridge this?

---

## Solution: Map AI Judges to Wallet Addresses

### Approach 1: 3 AI Judges + Worker = 4 Multisig Participants

#### Mapping:
```
Multisig Participant #1: Worker/Assignee
  - Wallet: User's actual wallet address
  - Auto-approves: When they submit work

Multisig Participant #2: VALIDATOR-PRIME (Judge 1)
  - Wallet: Server wallet #1 (controlled by Coinbase server)
  - Signs when: AI approves the work

Multisig Participant #3: IMPACT-SAGE (Judge 2)
  - Wallet: Server wallet #2 (controlled by Coinbase server)
  - Signs when: AI approves the work

Multisig Participant #4: CHAOS-ARBITER (Judge 3)
  - Wallet: Server wallet #3 (controlled by Coinbase server)
  - Signs when: AI approves the work
```

#### Decision Logic:
- Worker submits → Auto-signs (1/4) ✅
- If AI judge APPROVES → Server signs onchain (2/4, 3/4, 4/4) ✅
- If AI judge REJECTS → Server does NOT sign ❌
- **Result**: Only if ALL 3 AI judges approve + worker submitted = 4/4 signatures = Payment released

---

## Implementation Plan

### Step 1: Create Judge Wallets

You need **3 separate wallets** for the AI judges (or use the same Coinbase wallet for all 3):

**Option A: Same Wallet for All Judges** (Simpler)
```typescript
// All judges use the same server wallet
const JUDGE_WALLET = "0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe"
const COMMITTEE = [JUDGE_WALLET, JUDGE_WALLET, JUDGE_WALLET]
```
⚠️ **Problem**: Same address can't sign 3 times! Won't work with current contract.

**Option B: Generate 3 Separate Wallets** (Required)
```typescript
// Generate 3 different wallets for each judge
const VALIDATOR_PRIME_WALLET = "0x..." // Judge 1
const IMPACT_SAGE_WALLET = "0x..."     // Judge 2
const CHAOS_ARBITER_WALLET = "0x..."   // Judge 3

const COMMITTEE = [
  VALIDATOR_PRIME_WALLET,
  IMPACT_SAGE_WALLET,
  CHAOS_ARBITER_WALLET
]
```

### Step 2: Project Creation Flow

When creating a project, deploy the multisig with worker + 3 AI judges:

```typescript
// frontend/app/api/projects/create/route.ts
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export async function POST(request: Request) {
  const { assignee, title, description, reward, deadlines } = await request.json();

  // Step 1: Generate project key
  const projectKey = ethers.utils.id(`project_${Date.now()}`);

  // Step 2: Deploy CallConfirmation4of4 multisig
  const committee = [
    process.env.VALIDATOR_PRIME_WALLET!,
    process.env.IMPACT_SAGE_WALLET!,
    process.env.CHAOS_ARBITER_WALLET!,
  ];

  const multisigAddress = await deployMultisig(assignee, committee);

  // Step 3: Create project in Supabase
  const { data: project } = await supabase
    .from('projects')
    .insert({
      contract_key: projectKey,
      assignee_address: assignee,
      title,
      description,
      multisig_address: multisigAddress, // Store multisig address
    })
    .select()
    .single();

  // Step 4: Create project onchain via Main contract
  const account = privateKeyToAccount(process.env.SERVER_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: RONIN_SAIGON,
    transport: http(),
  });

  const hash = await walletClient.writeContract({
    address: MAIN_CONTRACT_ADDRESS,
    abi: MAIN_ABI,
    functionName: 'createProject',
    args: [
      projectKey,
      assignee,
      deadlines.begin,
      deadlines.end,
      project.id, // dbId
      reward,
      multisigAddress,
    ],
  });

  return Response.json({ success: true, projectKey, multisigAddress });
}

async function deployMultisig(assignee: string, committee: string[]) {
  const account = privateKeyToAccount(process.env.SERVER_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: RONIN_SAIGON,
    transport: http(),
  });

  // Deploy CallConfirmation4of4
  const hash = await walletClient.deployContract({
    abi: CALL_CONFIRMATION_ABI,
    bytecode: CALL_CONFIRMATION_BYTECODE,
    args: [assignee, committee],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return receipt.contractAddress;
}
```

### Step 3: Work Submission Flow

When worker submits work, they sign the multisig (1/4):

```typescript
// frontend/app/components/WorkSubmission.tsx
const handleSubmit = async () => {
  // Step 1: Update Supabase with submission
  await supabase
    .from('projects')
    .update({
      submission_url: submissionUrl,
      submission_notes: submissionNotes,
    })
    .eq('id', projectId);

  // Step 2: Worker signs onchain (1/4)
  const callId = ethers.utils.id(`PROJECT_PAYOUT:${projectKey}`);

  // This needs to be signed by the USER'S wallet (not server)
  const tx = await userWallet.writeContract({
    address: MAIN_CONTRACT_ADDRESS,
    abi: MAIN_ABI,
    functionName: 'signProject',
    args: [projectKey],
  });

  await tx.wait();

  // Step 3: Trigger AI council evaluation
  setShowAICouncil(true);
};
```

### Step 4: AI Council → Onchain Signing

After each AI judge votes, if they approve, the server signs onchain:

```typescript
// frontend/app/api/council/sign-onchain/route.ts
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export async function POST(request: Request) {
  const { projectKey, judgeId, approved } = await request.json();

  // Only sign if judge approved
  if (!approved) {
    return Response.json({
      success: false,
      reason: 'Judge rejected - not signing onchain'
    });
  }

  // Get judge's wallet private key
  const judgeWalletKey = {
    judge1: process.env.VALIDATOR_PRIME_KEY!,
    judge2: process.env.IMPACT_SAGE_KEY!,
    judge3: process.env.CHAOS_ARBITER_KEY!,
  }[judgeId];

  const account = privateKeyToAccount(judgeWalletKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: RONIN_SAIGON,
    transport: http(),
  });

  // Sign the multisig approval onchain
  const hash = await walletClient.writeContract({
    address: MAIN_CONTRACT_ADDRESS,
    abi: MAIN_ABI,
    functionName: 'signProject',
    args: [projectKey],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return Response.json({
    success: true,
    txHash: hash,
    judge: judgeId,
    approvals: '?/4' // Query from contract
  });
}
```

### Step 5: Update AICouncil Component

Modify the AI council to trigger onchain signing:

```typescript
// frontend/app/components/AICouncil.tsx

const evaluateJudge = async (index: number) => {
  const judge = judges[index];

  // ... existing AI evaluation code ...

  const response = await fetch('/api/council/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      judgeId: judge.id,
      judgeName: judge.name,
      judgePersonality: judge.personality,
      projectId,
      submissionUrl,
      submissionNotes,
    }),
  });

  const result = await response.json();

  // Update judge with vote result
  setJudges(prev => prev.map((j, i) =>
    i === index ? {
      ...j,
      status: 'voted',
      vote: result.vote,
      reasoning: result.reasoning
    } : j
  ));

  // NEW: Sign onchain if approved
  if (result.vote) {
    setCouncilDiscussion(prev => [...prev, `> ${judge.name} APPROVED - SIGNING ONCHAIN...`]);

    const signResult = await fetch('/api/council/sign-onchain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectKey,
        judgeId: judge.id,
        approved: true,
      }),
    });

    const { txHash, approvals } = await signResult.json();
    setCouncilDiscussion(prev => [...prev, `> ONCHAIN SIGNATURE: ${txHash}`]);
    setCouncilDiscussion(prev => [...prev, `> TOTAL APPROVALS: ${approvals}`]);
  } else {
    setCouncilDiscussion(prev => [...prev, `> ${judge.name} REJECTED - NOT SIGNING`]);
  }

  // Save vote to Supabase
  await supabase.from('council_votes').insert({
    project_id: projectId,
    judge_id: judge.id,
    judge_name: judge.name,
    vote: result.vote,
    reason: result.reasoning,
    ai_provider: judge.aiProvider,
  });
};

const calculateFinalDecision = async () => {
  const approvals = judges.filter(j => j.vote).length;
  const approved = approvals >= 2; // Majority (but onchain needs 3/3)

  setFinalDecision(approved ? 'approved' : 'rejected');

  if (approved && approvals === 3) {
    // All 3 AI judges approved = 3/4 signatures
    // Worker already signed = 4/4 signatures
    // Contract will auto-finalize!
    setCouncilDiscussion(prev => [...prev, '\n> ALL JUDGES APPROVED']);
    setCouncilDiscussion(prev => [...prev, '> 4/4 MULTISIG SIGNATURES COLLECTED']);
    setCouncilDiscussion(prev => [...prev, '> PROJECT FINALIZED ONCHAIN']);
    setCouncilDiscussion(prev => [...prev, '> PAYMENT RELEASED TO ASSIGNEE']);
  } else {
    setCouncilDiscussion(prev => [...prev, '\n> INSUFFICIENT APPROVALS']);
    setCouncilDiscussion(prev => [...prev, '> PROJECT REJECTED']);
  }

  setEvaluationComplete(true);
  onComplete(approved && approvals === 3, approved ? 'Project approved by council' : 'Project rejected');
};
```

---

## Environment Variables Needed

Add to `frontend/.env`:

```bash
# Judge Wallets (3 separate wallets)
VALIDATOR_PRIME_WALLET=0x...
VALIDATOR_PRIME_KEY=0x...

IMPACT_SAGE_WALLET=0x...
IMPACT_SAGE_KEY=0x...

CHAOS_ARBITER_WALLET=0x...
CHAOS_ARBITER_KEY=0x...

# Server wallet (for deploying multisigs)
SERVER_PRIVATE_KEY=0x...

# Ronin Saigon
NEXT_PUBLIC_RPC_URL=https://saigon-testnet.roninchain.com/rpc
NEXT_PUBLIC_CHAIN_ID=2021
```

---

## Complete Flow Diagram

```
1. Project Created
   ├─ Deploy CallConfirmation4of4(worker, [judge1, judge2, judge3])
   ├─ Call Main.createProject(key, worker, deadlines, reward, multisig)
   └─ Store in Supabase

2. Worker Submits Work
   ├─ Update Supabase (submission_url, notes)
   ├─ Worker signs: Main.signProject(key)  [1/4] ✅
   └─ Trigger AI Council evaluation

3. AI Council Evaluates
   ├─ Judge 1 (VALIDATOR-PRIME) votes
   │   └─ If APPROVE → Sign onchain [2/4] ✅
   │   └─ If REJECT → Don't sign ❌
   │
   ├─ Judge 2 (IMPACT-SAGE) votes
   │   └─ If APPROVE → Sign onchain [3/4] ✅
   │   └─ If REJECT → Don't sign ❌
   │
   └─ Judge 3 (CHAOS-ARBITER) votes
       └─ If APPROVE → Sign onchain [4/4] ✅ → AUTO-FINALIZE!
       └─ If REJECT → Don't sign ❌

4. Auto-Finalization (when 4/4)
   ├─ Main._finalizeProject() called automatically
   ├─ ProjectData.evaluatePayment() calculates reward
   ├─ Shares allocated: projectReward[key] = shares
   ├─ Project status set to "Done"
   └─ Worker can now withdraw rewards

5. Worker Withdraws
   ├─ Call Main.withdrawProjectReward(key, worker)
   ├─ Shares transferred to worker
   └─ Call RewardVault.withdraw(shares, receiver)
       └─ USDC sent to worker
```

---

## Alternative Approach: 3-of-3 Multisig (Simpler)

If you want **only** AI judges to vote (no worker signature), modify the contract:

### Create `CallConfirmation3of3.sol`:

```solidity
contract CallConfirmation3of3 {
    address public immutable committee0;
    address public immutable committee1;
    address public immutable committee2;

    mapping(bytes32 => mapping(address => bool)) public approved;
    mapping(bytes32 => uint256) public approvalCount;

    constructor(address[3] memory committee) {
        committee0 = committee[0];
        committee1 = committee[1];
        committee2 = committee[2];
    }

    function approve(bytes32 callId) external {
        require(isParticipant(msg.sender), "not participant");
        require(!approved[callId][msg.sender], "already approved");

        approved[callId][msg.sender] = true;
        approvalCount[callId]++;

        emit Approved(callId, msg.sender, approvalCount[callId]);
    }

    function isConfirmed(bytes32 callId) external view returns (bool) {
        return approvalCount[callId] == 3; // Only need 3 AI judges
    }

    function isParticipant(address account) public view returns (bool) {
        return account == committee0 || account == committee1 || account == committee2;
    }
}
```

This way:
- Worker submits work (offchain only)
- 3 AI judges evaluate
- If 2/3 approve → majority offchain decision
- All 3 who approved sign onchain → 3/3 multisig → finalize

---

## Recommendation

**Use 4-of-4 with Worker + 3 AI Judges**:
- ✅ Worker has skin in the game (must sign to get paid)
- ✅ Aligns with existing contract
- ✅ More secure (worker attests they did the work)
- ✅ Clear responsibility chain

**Implementation Priority**:
1. Generate 3 judge wallets
2. Modify project creation to deploy multisig
3. Update work submission to have worker sign
4. Add onchain signing to AI council evaluation
5. Test complete flow on Ronin Saigon

The AI council votes are **advisory** and trigger **onchain signatures**. The smart contract enforces the final decision (4/4 required).
