# Smart Contract Integration Guide

Your app is now configured to interact with custom smart contracts! Here's what was set up and how to use it.

## ✅ What's Been Integrated

### 1. **Smart Contract Action Provider**
Location: `src/agentkit/action-providers/smartContractActionProvider.ts`

A fully-functional action provider that enables your AI agent to:
- Read contract state (view/pure functions)
- Execute transactions (state-changing functions)
- Discover available functions dynamically
- Handle payable functions with ETH transfers

### 2. **Configuration System**
Location: `app/api/agent/contract-configs.ts`

A centralized configuration file where you define all contracts the agent can interact with.

### 3. **AgentKit Integration**
Location: `app/api/agent/prepare-agentkit.ts`

The smart contract provider is now automatically loaded when your agent starts.

## 🚀 How to Add Your First Contract

### Step 1: Get Your Contract Details

You need:
- **Contract Address**: e.g., `0x1234567890123456789012345678901234567890`
- **ABI**: The contract's interface definition
- **Network**: e.g., `base-sepolia`, `base-mainnet`

### Step 2: Edit `contract-configs.ts`

Open `app/api/agent/contract-configs.ts` and add your contract:

```typescript
import { Address } from "viem";
import type { SmartContractConfig } from "@/src/agentkit/action-providers";

const MY_TOKEN: SmartContractConfig = {
  contractAddress: "0x1234567890123456789012345678901234567890" as Address,
  abi: [
    {
      type: "function",
      name: "balanceOf",
      inputs: [{ type: "address", name: "account" }],
      outputs: [{ type: "uint256", name: "" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "transfer",
      inputs: [
        { type: "address", name: "to" },
        { type: "uint256", name: "amount" },
      ],
      outputs: [{ type: "bool", name: "" }],
      stateMutability: "nonpayable",
    },
  ] as const,
  supportedNetworks: ["base-sepolia"],
  contractDescription: "My Custom Token",
};

export const SMART_CONTRACT_CONFIGS = {
  myToken: MY_TOKEN,
};
```

### Step 3: Restart Your App

```bash
npm run dev
```

That's it! Your agent can now interact with the contract.

## 💬 Example Conversations

Once configured, you can interact with your contracts naturally:

### Querying Contract State
```
You: "What's my token balance?"
Agent: [Calls read_contract with balanceOf function]

You: "What functions can I call on myToken?"
Agent: [Calls list_read_functions and list_write_functions]

You: "Show me contract info"
Agent: [Calls get_contract_info]
```

### Executing Transactions
```
You: "Send 10 tokens to 0xabc..."
Agent: [Calls write_contract with transfer function]

You: "Approve 0xdef... to spend 100 tokens"
Agent: [Calls write_contract with approve function]
```

### Complex Operations
```
You: "Check if proposal 5 has passed"
Agent: [Calls read_contract with getProposal function]

You: "Vote yes on proposal 5"
Agent: [Calls write_contract with vote function]
```

## 📚 Available Actions

Every configured contract automatically gets these actions:

| Action | Description | Use Case |
|--------|-------------|----------|
| `read_contract` | Call view/pure functions | Query balances, check state |
| `write_contract` | Execute state-changing functions | Transfer tokens, vote, mint NFTs |
| `list_read_functions` | Show all read-only functions | Discover what you can query |
| `list_write_functions` | Show all state-changing functions | Discover what you can execute |
| `get_contract_info` | Get contract details | See address, networks, function count |

## 🔧 Advanced Configuration

### Multiple Contracts

Add as many contracts as you need:

```typescript
export const SMART_CONTRACT_CONFIGS = {
  usdc: USDC_CONFIG,
  myNFT: NFT_CONFIG,
  dao: DAO_CONFIG,
  marketplace: MARKETPLACE_CONFIG,
};
```

### Network-Specific Deployments

Same contract on different networks:

```typescript
const MY_CONTRACT: SmartContractConfig = {
  contractAddress: "0x..." as Address,
  abi: [...] as const,
  supportedNetworks: ["base-sepolia", "base-mainnet", "optimism-mainnet"],
  contractDescription: "Multi-network contract",
};
```

### Payable Functions

The provider automatically handles payable functions:

```typescript
{
  type: "function",
  name: "buyNFT",
  inputs: [{ type: "uint256", name: "tokenId" }],
  outputs: [],
  stateMutability: "payable", // Accepts ETH
}
```

Agent will be able to execute:
```
You: "Buy NFT #42 for 0.5 ETH"
Agent: [Calls write_contract with value: "0.5"]
```

## 🎯 Quick Examples

### ERC20 Token

See: `src/agentkit/action-providers/examples/erc20-example.ts`

Uncomment the USDC example in `contract-configs.ts`:

```typescript
const USDC_BASE_SEPOLIA: SmartContractConfig = {
  contractAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address,
  abi: [/* USDC ABI */] as const,
  supportedNetworks: ["base-sepolia"],
  contractDescription: "USDC Stablecoin",
};

export const SMART_CONTRACT_CONFIGS = {
  usdc: USDC_BASE_SEPOLIA,
};
```

### Custom DAO

See: `src/agentkit/action-providers/examples/custom-contract-example.ts`

Full examples for DAO voting and NFT marketplace contracts.

## 🛠️ Getting ABIs

### From Hardhat/Foundry

```bash
# Hardhat
cat artifacts/contracts/MyContract.sol/MyContract.json | jq '.abi'

# Foundry
cat out/MyContract.sol/MyContract.json | jq '.abi'
```

### From Block Explorer

1. Go to Basescan/Etherscan
2. Find your contract
3. Go to "Contract" tab
4. Copy ABI (usually in JSON format)

### From TypeChain

If using TypeChain, ABIs are in your typechain output directory.

## 🧪 Testing Your Integration

### 1. Check Available Actions

Start your app and in the agent chat, ask:
```
"What contracts can you interact with?"
"List all available smart contract functions"
```

### 2. Test Read Operations

```
"Get the contract info for [contract name]"
"What read functions are available on [contract name]?"
"Call [function name] with [arguments]"
```

### 3. Test Write Operations

```
"What write functions are available on [contract name]?"
"Execute [function name] with [arguments]"
```

### 4. Monitor Transactions

Check wallet transactions:
```
"Show my recent transactions"
"What's my wallet balance?"
```

## 📁 File Structure

```
the_blob/
├── src/agentkit/action-providers/
│   ├── smartContractActionProvider.ts  # Main provider
│   ├── index.ts                        # Exports
│   └── examples/
│       ├── erc20-example.ts           # ERC20 example
│       └── custom-contract-example.ts # Advanced examples
├── app/api/agent/
│   ├── prepare-agentkit.ts            # AgentKit setup (integrated)
│   └── contract-configs.ts            # Your contract configs (edit this!)
└── docs/
    ├── SMART_CONTRACT_ACTION_PROVIDER.md  # Detailed docs
    └── INTEGRATION_GUIDE.md               # This file
```

## 🔍 Troubleshooting

### "Contract not found" or "Function not available"

1. Check that your contract is in `SMART_CONTRACT_CONFIGS` exports
2. Verify the network matches (`supportedNetworks`)
3. Confirm the ABI includes the function you're trying to call

### "Transaction failed"

1. Check wallet has sufficient balance
2. Verify function arguments are correct
3. Ensure you're on the right network
4. Check if function requires specific permissions

### TypeScript errors

1. Make sure ABIs have `as const` assertion
2. Import `Address` type from `viem`
3. Cast addresses with `as Address`

### Provider not loading

1. Restart your development server
2. Check console for import errors
3. Verify file paths are correct

## 🎓 Next Steps

1. **Read the full docs**: `docs/SMART_CONTRACT_ACTION_PROVIDER.md`
2. **Check the examples**: `src/agentkit/action-providers/examples/`
3. **Add your contracts**: Edit `app/api/agent/contract-configs.ts`
4. **Test thoroughly**: Start with testnet (`base-sepolia`)
5. **Deploy to production**: Update to mainnet addresses

## 🤝 Support

- Main docs: `docs/SMART_CONTRACT_ACTION_PROVIDER.md`
- AgentKit docs: https://docs.cdp.coinbase.com/agentkit/docs/welcome
- Viem docs: https://viem.sh/

---

**You're all set!** The smart contract action provider is fully integrated and ready to use. Just add your contract configurations and start chatting with your agent.
