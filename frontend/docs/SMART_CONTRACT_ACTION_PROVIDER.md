# Smart Contract Action Provider

A custom action provider for AgentKit that enables AI agents to interact with any EVM smart contract by providing ABI-based function calling capabilities.

## Features

- **🔍 ABI-Based Function Discovery**: Automatically generates actions from your contract ABI
- **📖 Read Operations**: Query contract state without gas costs (view/pure functions)
- **✍️ Write Operations**: Execute state-changing transactions with automatic gas handling
- **🔐 Type Safety**: Zod schema validation for all inputs
- **🌐 Multi-Network Support**: Works on any EVM network with configurable network restrictions
- **💰 Payable Function Support**: Handles ETH transfers for payable functions
- **🤖 AI-Friendly**: Provides detailed function listings and descriptions for LLM understanding

## Installation

The provider is already included in your project at:
```
src/agentkit/action-providers/smartContractActionProvider.ts
```

## Quick Start

### 1. Define Your Contract Configuration

```typescript
import { smartContractActionProvider } from "./agentkit/action-providers/smartContractActionProvider";

// Your contract's ABI
const MY_CONTRACT_ABI = [
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
      { type: "uint256", name: "amount" }
    ],
    outputs: [{ type: "bool", name: "" }],
    stateMutability: "nonpayable",
  },
] as const;

// Create the action provider
const myContractProvider = smartContractActionProvider({
  contractAddress: "0x1234567890123456789012345678901234567890",
  abi: MY_CONTRACT_ABI,
  supportedNetworks: ["base-sepolia", "base-mainnet"],
  contractDescription: "My Custom Token Contract",
});
```

### 2. Register with AgentKit

```typescript
import { AgentKit } from "@coinbase/agentkit";

const agentkit = await AgentKit.from({
  walletProvider,
  actionProviders: [
    myContractProvider,
    // ... other action providers
  ],
});
```

### 3. Use in Your Application

The AI agent can now interact with your contract:

```typescript
// User: "What's my token balance?"
// Agent automatically calls: read_contract(functionName: "balanceOf", args: [userAddress])

// User: "Send 100 tokens to 0xabc..."
// Agent automatically calls: write_contract(functionName: "transfer", args: ["0xabc...", "100000000000000000000"])
```

## Configuration Options

### `SmartContractConfig`

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `contractAddress` | `Address` | ✅ | The deployed contract address (0x...) |
| `abi` | `Abi` | ✅ | The contract's ABI (Application Binary Interface) |
| `supportedNetworks` | `string[]` | ❌ | Network IDs where contract is deployed (e.g., `["base-sepolia"]`). If omitted, supports all EVM networks |
| `actionNamePrefix` | `string` | ❌ | Custom prefix for action names (defaults to "smart_contract") |
| `contractDescription` | `string` | ❌ | Human-readable contract description for AI context |

## Available Actions

The provider automatically creates these actions:

### 1. `read_contract`
Call read-only (view/pure) functions to query contract state.

**Parameters:**
- `functionName` (string): Name of the function to call
- `args` (array, optional): Function arguments

**Example:**
```typescript
// Query a balance
{
  functionName: "balanceOf",
  args: ["0x1234..."]
}

// Get token name (no args)
{
  functionName: "name"
}
```

### 2. `write_contract`
Execute state-changing functions that modify blockchain state.

**Parameters:**
- `functionName` (string): Name of the function to call
- `args` (array, optional): Function arguments
- `value` (string, optional): Amount of ETH to send (in ETH units, e.g., "0.1")
- `gasLimit` (string, optional): Custom gas limit override

**Example:**
```typescript
// Transfer tokens
{
  functionName: "transfer",
  args: ["0x5678...", "1000000000000000000"]
}

// Buy NFT with ETH (payable function)
{
  functionName: "buyNFT",
  args: ["0xabc...", "42"],
  value: "0.5"
}
```

### 3. `list_read_functions`
Get a list of all available read-only functions with their signatures.

**Example Output:**
```
📖 Read-only functions available on 0x1234...:

  • name() → string
  • symbol() → string
  • balanceOf(account: address) → uint256
  • totalSupply() → uint256
```

### 4. `list_write_functions`
Get a list of all state-changing functions with their signatures.

**Example Output:**
```
✍️ State-changing functions available on 0x1234...:

  • transfer(to: address, amount: uint256)
  • approve(spender: address, amount: uint256)
  • mint(to: address, amount: uint256) [PAYABLE]
```

### 5. `get_contract_info`
Get comprehensive information about the contract.

**Example Output:**
```
📋 Smart Contract Information:

Contract Address: 0x1234...
Current Network: base-sepolia
Supported Networks: base-sepolia, base-mainnet
Description: My Custom Token Contract

📖 Read Functions: 5
✍️ Write Functions: 3
```

## Examples

### Example 1: ERC20 Token

See `src/agentkit/action-providers/examples/erc20-example.ts`

```typescript
const usdcProvider = smartContractActionProvider({
  contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  abi: ERC20_ABI,
  supportedNetworks: ["base-mainnet"],
  contractDescription: "USDC Stablecoin on Base",
});
```

**Sample Conversations:**
- "What's my USDC balance?" → Calls `balanceOf`
- "Send 10 USDC to 0x123..." → Calls `transfer`
- "Approve Uniswap to spend 100 USDC" → Calls `approve`

### Example 2: DAO Voting Contract

See `src/agentkit/action-providers/examples/custom-contract-example.ts`

```typescript
const daoProvider = smartContractActionProvider({
  contractAddress: "0x...",
  abi: DAO_VOTING_ABI,
  supportedNetworks: ["base-sepolia"],
  contractDescription: "DAO Voting Contract",
});
```

**Sample Conversations:**
- "How many proposals exist?" → Calls `proposalCount`
- "Show me proposal 1" → Calls `getProposal`
- "Vote yes on proposal 1" → Calls `vote`
- "Create a new proposal" → Calls `createProposal`

### Example 3: NFT Marketplace

```typescript
const marketplaceProvider = smartContractActionProvider({
  contractAddress: "0x...",
  abi: NFT_MARKETPLACE_ABI,
  supportedNetworks: ["base-mainnet", "base-sepolia"],
  contractDescription: "NFT Marketplace",
});
```

**Sample Conversations:**
- "List my NFT for 0.5 ETH" → Calls `listNFT`
- "Buy NFT at 0xabc... token 42" → Calls `buyNFT` with value
- "Cancel my listing" → Calls `cancelListing`

## Integration Guide

### Step 1: Prepare Your ABI

Export your contract ABI from your Solidity build output or fetch it from a block explorer:

```typescript
// From Hardhat/Foundry build output
import { abi } from "./artifacts/contracts/MyContract.sol/MyContract.json";

// Or define manually
const ABI = [
  {
    type: "function",
    name: "myFunction",
    inputs: [...],
    outputs: [...],
    stateMutability: "view" | "pure" | "nonpayable" | "payable"
  }
];
```

### Step 2: Create Provider Instance

```typescript
import { smartContractActionProvider } from "./agentkit/action-providers/smartContractActionProvider";

export const myProvider = smartContractActionProvider({
  contractAddress: "0x...",
  abi: ABI,
  supportedNetworks: ["base-sepolia"], // Optional
  contractDescription: "My awesome contract", // Optional
});
```

### Step 3: Add to AgentKit Configuration

In your `src/agentkit/prepare-agentkit.ts`:

```typescript
import { myProvider } from "./action-providers/myContractProvider";

const agentkit = await AgentKit.from({
  walletProvider,
  actionProviders: [
    walletActionProvider(),
    wethActionProvider(),
    erc20ActionProvider(),
    myProvider, // Add your custom provider
  ],
});
```

### Step 4: Test the Integration

```typescript
// List available actions
const actions = agentkit.getActions();
console.log(actions.map(a => a.name));

// Should include:
// - read_contract
// - write_contract
// - list_read_functions
// - list_write_functions
// - get_contract_info
```

## Advanced Usage

### Dynamic Contract Loading

Load contracts dynamically based on user input:

```typescript
function createContractProvider(address: string, abi: Abi) {
  return smartContractActionProvider({
    contractAddress: address as Address,
    abi,
    supportedNetworks: ["base-sepolia"],
  });
}

// Add to agentkit at runtime
const newProvider = createContractProvider(userProvidedAddress, fetchedAbi);
// Note: You'll need to reinitialize AgentKit with the new provider
```

### Multi-Contract Support

Create multiple providers for different contracts:

```typescript
const agentkit = await AgentKit.from({
  walletProvider,
  actionProviders: [
    smartContractActionProvider({
      contractAddress: "0x...",
      abi: TOKEN_ABI,
      actionNamePrefix: "token",
    }),
    smartContractActionProvider({
      contractAddress: "0x...",
      abi: NFT_ABI,
      actionNamePrefix: "nft",
    }),
  ],
});
```

### Network-Specific Contracts

Deploy the same contract to multiple networks:

```typescript
const multiNetworkProvider = smartContractActionProvider({
  contractAddress: "0x..." as Address, // Same address on all networks
  abi: MY_ABI,
  supportedNetworks: [
    "base-mainnet",
    "base-sepolia",
    "optimism-mainnet",
    "arbitrum-mainnet",
  ],
});
```

## Type Safety

The provider uses Zod for runtime validation and viem for type-safe contract interactions:

- **Input Validation**: All function arguments are validated against the ABI
- **Address Validation**: Ethereum addresses must be valid hex strings
- **Number Handling**: Large numbers (uint256) are handled as strings to prevent precision loss
- **Type Inference**: Function signatures are automatically inferred from the ABI

## Error Handling

The provider handles various error scenarios:

- **Function Not Found**: Returns available functions list
- **Wrong Function Type**: Distinguishes between read/write functions
- **Non-Payable ETH Send**: Prevents sending ETH to non-payable functions
- **Insufficient Balance**: Checks balances before transactions
- **Network Mismatch**: Filters actions based on current network

## Best Practices

1. **Test on Testnet First**: Always test with `supportedNetworks: ["base-sepolia"]` before mainnet
2. **Provide Clear Descriptions**: Help the AI understand your contract's purpose
3. **Use Specific ABIs**: Only include functions you want the AI to access
4. **Handle Large Numbers**: Use string representations for uint256 values
5. **Monitor Gas**: Set reasonable gas limits for complex operations
6. **Validate Results**: Add logging to track contract interactions

## Troubleshooting

### "Function not found in ABI"
- Ensure the function name matches exactly (case-sensitive)
- Check that the function is included in your ABI
- Use `list_read_functions` or `list_write_functions` to see available functions

### "Network not supported"
- Verify the current network matches `supportedNetworks`
- Check wallet provider network configuration
- Use empty array for `supportedNetworks` to support all EVM networks

### "Error executing contract function"
- Check function arguments match expected types
- Verify wallet has sufficient balance for transactions
- Ensure contract address is correct
- Check if function requires specific permissions

## Architecture

The Smart Contract Action Provider follows the AgentKit action provider pattern:

```
SmartContractActionProvider
├── Extends: ActionProvider<EvmWalletProvider>
├── Actions:
│   ├── @CreateAction read_contract
│   ├── @CreateAction write_contract
│   ├── @CreateAction list_read_functions
│   ├── @CreateAction list_write_functions
│   └── @CreateAction get_contract_info
├── Schema Validation: Zod
├── Contract Interaction: viem
└── Network Filtering: supportsNetwork()
```

## Contributing

To add new features to the Smart Contract Action Provider:

1. Modify `src/agentkit/action-providers/smartContractActionProvider.ts`
2. Add new `@CreateAction` decorated methods
3. Update schemas in the same file
4. Add examples to `examples/` directory
5. Update this documentation

## License

This action provider is part of your project and follows the same license.

## Related Documentation

- [AgentKit Documentation](https://docs.cdp.coinbase.com/agentkit/docs/welcome)
- [Viem Documentation](https://viem.sh/)
- [EVM Contract ABI Specification](https://docs.soliditylang.org/en/latest/abi-spec.html)
- [Zod Schema Validation](https://zod.dev/)

## File Locations

- **Main Provider**: `src/agentkit/action-providers/smartContractActionProvider.ts`
- **ERC20 Example**: `src/agentkit/action-providers/examples/erc20-example.ts`
- **Custom Contract Examples**: `src/agentkit/action-providers/examples/custom-contract-example.ts`
- **Documentation**: `docs/SMART_CONTRACT_ACTION_PROVIDER.md`
