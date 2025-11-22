/**
 * Smart Contract Action Provider
 *
 * Enables AI agents to interact with custom smart contracts by providing ABI-based
 * function calling capabilities. Supports both read (view/pure) and write (state-changing)
 * operations on EVM-compatible smart contracts.
 *
 * Features:
 * - Dynamic ABI parsing and function discovery
 * - Type-safe parameter encoding using viem
 * - Automatic read vs write operation detection
 * - Gas estimation and transaction handling
 * - Multi-network support
 *
 * Usage:
 * ```typescript
 * const provider = smartContractActionProvider({
 *   contractAddress: "0x...",
 *   abi: [...],
 *   supportedNetworks: ["base-sepolia", "base-mainnet"]
 * });
 *
 * agentkit = await AgentKit.from({
 *   walletProvider,
 *   actionProviders: [provider, ...]
 * });
 * ```
 */

import { z } from "zod";
import {
  customActionProvider,
  Network,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import {
  encodeFunctionData,
  parseUnits,
  type Abi,
  type AbiFunction,
  type Address,
} from "viem";

/**
 * Configuration options for the Smart Contract Action Provider
 */
export interface SmartContractConfig {
  /** The deployed contract address */
  contractAddress: Address;

  /** The contract's ABI (Application Binary Interface) */
  abi: Abi;

  /** Optional: Network IDs where this contract is deployed (e.g., ["base-sepolia"]) */
  supportedNetworks?: string[];

  /** Optional: Custom name prefix for actions (defaults to contract name from ABI) */
  actionNamePrefix?: string;

  /** Optional: Description for the contract (used in action descriptions) */
  contractDescription?: string;
}

/**
 * Schema for calling smart contract read functions (view/pure)
 */
export const ReadContractSchema = z.object({
  functionName: z.string().describe("The name of the contract function to call"),
  args: z.array(z.union([z.string(), z.number(), z.boolean()])).optional().describe("Array of arguments to pass to the function"),
}).describe("Call a read-only function on the smart contract");

/**
 * Schema for calling smart contract write functions (state-changing)
 */
export const WriteContractSchema = z.object({
  functionName: z.string().describe("The name of the contract function to call"),
  args: z.array(z.union([z.string(), z.number(), z.boolean()])).optional().describe("Array of arguments to pass to the function"),
  value: z.string().optional().describe("Amount of ETH to send with the transaction (in ETH, e.g., '0.1')"),
  gasLimit: z.string().optional().describe("Optional gas limit override"),
}).describe("Execute a state-changing function on the smart contract");

/**
 * Helper: Get all read-only function names from ABI
 */
function getReadFunctions(abi: Abi): string[] {
  return abi
    .filter((item): item is AbiFunction =>
      item.type === 'function' &&
      (item.stateMutability === 'view' || item.stateMutability === 'pure')
    )
    .map(item => item.name);
}

/**
 * Helper: Get all state-changing function names from ABI
 */
function getWriteFunctions(abi: Abi): string[] {
  return abi
    .filter((item): item is AbiFunction =>
      item.type === 'function' &&
      item.stateMutability !== 'view' &&
      item.stateMutability !== 'pure'
    )
    .map(item => item.name);
}

/**
 * Helper: Check if network is supported
 */
function supportsNetwork(network: Network, supportedNetworkIds: string[]): boolean {
  // Must be EVM network
  if (network.protocolFamily !== "evm") {
    return false;
  }

  // If no specific networks configured, support all EVM networks
  if (supportedNetworkIds.length === 0) {
    return true;
  }

  // Check if current network is in supported list
  return supportedNetworkIds.includes(network.networkId || network.chainId || "");
}

/**
 * Factory function to create a Smart Contract Action Provider
 *
 * @example
 * ```typescript
 * const myContractProvider = smartContractActionProvider({
 *   contractAddress: "0x1234...",
 *   abi: [...],
 *   supportedNetworks: ["base-sepolia"],
 *   contractDescription: "My Custom Token Contract"
 * });
 * ```
 */
export const smartContractActionProvider = (config: SmartContractConfig) => {
  const { contractAddress, abi, supportedNetworks = [], contractDescription } = config;
  const description = contractDescription || `Smart contract at ${contractAddress}`;

  return customActionProvider([
    {
      name: "read_contract",
      description: "Call a read-only (view/pure) function on the smart contract to query data without modifying state",
      schema: ReadContractSchema,
      invoke: async (walletProvider: EvmWalletProvider, args: z.infer<typeof ReadContractSchema>) => {
        try {
          const { functionName, args: functionArgs = [] } = args;

          // Check network support
          const network = walletProvider.getNetwork();
          if (!supportsNetwork(network, supportedNetworks)) {
            return `Error: Contract not supported on network ${network.networkId || network.chainId}`;
          }

          // Find the function in the ABI
          const abiFunction = abi.find(
            (item): item is AbiFunction =>
              item.type === 'function' &&
              item.name === functionName &&
              (item.stateMutability === 'view' || item.stateMutability === 'pure')
          );

          if (!abiFunction) {
            return `Error: Function '${functionName}' not found in ABI or is not a read-only function. Available read functions: ${getReadFunctions(abi).join(', ')}`;
          }

          // Call the contract
          const result = await walletProvider.readContract({
            address: contractAddress,
            abi: abi,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            functionName: functionName as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            args: functionArgs as any,
          });

          return `✅ Successfully read from contract function '${functionName}':\nResult: ${JSON.stringify(result, null, 2)}`;

        } catch (error) {
          return `❌ Error reading from contract: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    },
    {
      name: "write_contract",
      description: "Execute a state-changing function on the smart contract. This will submit a transaction and modify blockchain state.",
      schema: WriteContractSchema,
      invoke: async (walletProvider: EvmWalletProvider, args: z.infer<typeof WriteContractSchema>) => {
        try {
          const { functionName, args: functionArgs = [], value, gasLimit } = args;

          // Check network support
          const network = walletProvider.getNetwork();
          if (!supportsNetwork(network, supportedNetworks)) {
            return `Error: Contract not supported on network ${network.networkId || network.chainId}`;
          }

          // Find the function in the ABI
          const abiFunction = abi.find(
            (item): item is AbiFunction =>
              item.type === 'function' &&
              item.name === functionName &&
              item.stateMutability !== 'view' &&
              item.stateMutability !== 'pure'
          );

          if (!abiFunction) {
            return `Error: Function '${functionName}' not found in ABI or is not a state-changing function. Available write functions: ${getWriteFunctions(abi).join(', ')}`;
          }

          // Check if function is payable
          if (value && abiFunction.stateMutability !== 'payable') {
            return `Error: Function '${functionName}' is not payable and cannot accept ETH value`;
          }

          // Encode the function call
          const data = encodeFunctionData({
            abi: abi,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            functionName: functionName as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            args: functionArgs as any,
          });

          // Prepare transaction
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const txParams: any = {
            to: contractAddress,
            data,
          };

          if (value) {
            txParams.value = parseUnits(value, 18); // Convert ETH to wei
          }

          if (gasLimit) {
            txParams.gas = BigInt(gasLimit);
          }

          // Send transaction
          const hash = await walletProvider.sendTransaction(txParams);

          // Wait for confirmation
          await walletProvider.waitForTransactionReceipt(hash);

          return `✅ Successfully executed '${functionName}' on contract ${contractAddress}\nTransaction Hash: ${hash}\n${value ? `Value Sent: ${value} ETH\n` : ''}Status: Confirmed`;

        } catch (error) {
          return `❌ Error executing contract function: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
    },
    {
      name: "list_read_functions",
      description: "List all available read-only (view/pure) functions on the smart contract",
      schema: z.object({}).describe("Get list of read-only functions"),
      invoke: async (_walletProvider: EvmWalletProvider, _args: Record<string, never>) => {
        const readFunctions = getReadFunctions(abi);

        if (readFunctions.length === 0) {
          return "No read-only functions available in this contract.";
        }

        const functionDetails = readFunctions.map(name => {
          const func = abi.find(
            (item): item is AbiFunction => item.type === 'function' && item.name === name
          )!;

          const inputs = func.inputs?.map(i => `${i.name}: ${i.type}`).join(', ') || 'none';
          const outputs = func.outputs?.map(o => o.type).join(', ') || 'none';

          return `  • ${name}(${inputs}) → ${outputs}`;
        });

        return `📖 Read-only functions available on ${contractAddress}:\n\n${functionDetails.join('\n')}`;
      },
    },
    {
      name: "list_write_functions",
      description: "List all available state-changing functions on the smart contract",
      schema: z.object({}).describe("Get list of state-changing functions"),
      invoke: async (_walletProvider: EvmWalletProvider, _args: Record<string, never>) => {
        const writeFunctions = getWriteFunctions(abi);

        if (writeFunctions.length === 0) {
          return "No state-changing functions available in this contract.";
        }

        const functionDetails = writeFunctions.map(name => {
          const func = abi.find(
            (item): item is AbiFunction => item.type === 'function' && item.name === name
          )!;

          const inputs = func.inputs?.map(i => `${i.name}: ${i.type}`).join(', ') || 'none';
          const payable = func.stateMutability === 'payable' ? ' [PAYABLE]' : '';

          return `  • ${name}(${inputs})${payable}`;
        });

        return `✍️  State-changing functions available on ${contractAddress}:\n\n${functionDetails.join('\n')}`;
      },
    },
    {
      name: "get_contract_info",
      description: "Get information about the smart contract including address, supported networks, and available functions",
      schema: z.object({}).describe("Get contract information"),
      invoke: async (walletProvider: EvmWalletProvider, _args: Record<string, never>) => {
        const network = walletProvider.getNetwork();
        const readFunctions = getReadFunctions(abi);
        const writeFunctions = getWriteFunctions(abi);

        return `📋 Smart Contract Information:

Contract Address: ${contractAddress}
Current Network: ${network.networkId || network.chainId}
Supported Networks: ${supportedNetworks.length > 0 ? supportedNetworks.join(', ') : 'All EVM networks'}
Description: ${description}

📖 Read Functions: ${readFunctions.length}
✍️  Write Functions: ${writeFunctions.length}

Use 'list_read_functions' or 'list_write_functions' to see detailed function signatures.`;
      },
    },
  ]);
};

// Re-export for backwards compatibility
export { smartContractActionProvider as SmartContractActionProvider };
