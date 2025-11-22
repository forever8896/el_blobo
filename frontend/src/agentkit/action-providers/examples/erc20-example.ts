/**
 * Example: Using Smart Contract Action Provider with an ERC20 Token
 *
 * This example demonstrates how to create a custom action provider for
 * interacting with an ERC20 token contract.
 */

import { smartContractActionProvider } from "../smartContractActionProvider";

// Standard ERC20 ABI (subset of common functions)
const ERC20_ABI = [
  // Read functions
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ type: "string", name: "" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ type: "string", name: "" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8", name: "" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ type: "address", name: "account" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { type: "address", name: "owner" },
      { type: "address", name: "spender" },
    ],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
  },

  // Write functions
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
  {
    type: "function",
    name: "approve",
    inputs: [
      { type: "address", name: "spender" },
      { type: "uint256", name: "amount" },
    ],
    outputs: [{ type: "bool", name: "" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferFrom",
    inputs: [
      { type: "address", name: "from" },
      { type: "address", name: "to" },
      { type: "uint256", name: "amount" },
    ],
    outputs: [{ type: "bool", name: "" }],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * Create an action provider for a custom ERC20 token
 */
export const customTokenActionProvider = smartContractActionProvider({
  contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  abi: ERC20_ABI,
  supportedNetworks: ["base-mainnet", "base-sepolia"],
  contractDescription: "USDC Stablecoin on Base",
});

/**
 * Example usage with AgentKit:
 *
 * ```typescript
 * import { AgentKit } from "@coinbase/agentkit";
 * import { customTokenActionProvider } from "./examples/erc20-example";
 *
 * const agentkit = await AgentKit.from({
 *   walletProvider,
 *   actionProviders: [
 *     customTokenActionProvider,
 *     // ... other providers
 *   ],
 * });
 * ```
 *
 * The agent will now have access to these actions:
 * - read_contract: Query token data (name, symbol, balanceOf, etc.)
 * - write_contract: Execute transfers, approvals
 * - list_read_functions: See all available view functions
 * - list_write_functions: See all available state-changing functions
 * - get_contract_info: Get contract details
 *
 * Example conversations:
 *
 * User: "What's the name of this token?"
 * Agent: [Calls read_contract with functionName: "name"]
 *
 * User: "Check my USDC balance"
 * Agent: [Calls read_contract with functionName: "balanceOf", args: [userAddress]]
 *
 * User: "Send 10 USDC to 0x123..."
 * Agent: [Calls write_contract with functionName: "transfer", args: [0x123..., "10000000"]]
 */
