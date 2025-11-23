/**
 * Smart Contract Configurations
 *
 * Define your custom smart contracts here. Each configuration includes:
 * - contractAddress: The deployed contract address
 * - abi: The contract's Application Binary Interface
 * - supportedNetworks: Networks where this contract is deployed
 * - contractDescription: Human-readable description for the AI
 *
 * The AI agent will automatically be able to interact with these contracts
 * using the smartContractActionProvider.
 */

import type { Address } from "viem";
import type { SmartContractConfig } from "@/src/agentkit/action-providers";
import MainABI from "@/app/abis/Main.json";
import VaultABI from "@/app/abis/NativeRewardVault.json";

/**
 * Example: RON Token on Ronin (disabled - use native token instead)
 *
 * Ronin uses RON as native currency, similar to ETH on Ethereum
 */
const RON_TOKEN_EXAMPLE: SmartContractConfig = {
  contractAddress: "0x0000000000000000000000000000000000000000" as Address,
  abi: [
    {
      type: "function",
      name: "balanceOf",
      inputs: [{ type: "address", name: "account" }],
      outputs: [{ type: "uint256", name: "" }],
      stateMutability: "view",
    },
  ] as const,
  supportedNetworks: ["ronin-saigon-testnet"],
  contractDescription: "Example RON token - disabled (use native RON instead)",
};

/**
 * Example: Custom NFT Contract
 *
 * Template for adding your own NFT contract
 */
const MY_NFT_CONTRACT: SmartContractConfig = {
  contractAddress: "0x0000000000000000000000000000000000000000" as Address,
  abi: [
    {
      type: "function",
      name: "mint",
      inputs: [
        { type: "address", name: "to" },
        { type: "uint256", name: "tokenId" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "ownerOf",
      inputs: [{ type: "uint256", name: "tokenId" }],
      outputs: [{ type: "address", name: "" }],
      stateMutability: "view",
    },
  ] as const,
  supportedNetworks: ["ronin-saigon-testnet"],
  contractDescription: "My Custom NFT Collection on Ronin",
};

/**
 * Example: DAO Governance Contract
 *
 * Template for adding DAO voting capabilities
 */
const DAO_GOVERNANCE: SmartContractConfig = {
  contractAddress: "0x0000000000000000000000000000000000000000" as Address,
  abi: [
    {
      type: "function",
      name: "propose",
      inputs: [
        { type: "string", name: "description" },
        { type: "uint256", name: "votingPeriod" },
      ],
      outputs: [{ type: "uint256", name: "proposalId" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "vote",
      inputs: [
        { type: "uint256", name: "proposalId" },
        { type: "bool", name: "support" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "getProposal",
      inputs: [{ type: "uint256", name: "proposalId" }],
      outputs: [
        { type: "string", name: "description" },
        { type: "uint256", name: "votesFor" },
        { type: "uint256", name: "votesAgainst" },
      ],
      stateMutability: "view",
    },
  ] as const,
  supportedNetworks: ["ronin-saigon-testnet"],
  contractDescription: "DAO Governance Contract for on-chain voting on Ronin",
};

/**
 * Blob Platform Contracts on Ronin Saigon Testnet
 */
const BLOB_MAIN_CONTRACT: SmartContractConfig = {
  contractAddress: "0x0B5dC6664133ecf8C9DdB06518f945a8bD0D85Ae" as Address,
  abi: MainABI as any,
  supportedNetworks: ["ronin-saigon-testnet"],
  contractDescription: "Main contract for The Blob platform - handles user registration, project management, and rewards distribution on Ronin Saigon Testnet",
};

const BLOB_VAULT_CONTRACT: SmartContractConfig = {
  contractAddress: "0x0EB5a9A4a7B4002F7F7807c04DB40e7319baD1EB" as Address,
  abi: VaultABI as any,
  supportedNetworks: ["ronin-saigon-testnet"],
  contractDescription: "Native Reward Vault for The Blob platform - manages registration pricing and reward shares on Ronin Saigon Testnet",
};

/**
 * Export your active contract configurations
 *
 * Add or remove contracts from this object to control which contracts
 * the AI agent can interact with.
 */
export const SMART_CONTRACT_CONFIGS: Record<string, SmartContractConfig> = {
  // Blob Platform Contracts (Ronin Saigon Testnet)
  blobMain: BLOB_MAIN_CONTRACT,
  blobVault: BLOB_VAULT_CONTRACT,

  // Templates with placeholder addresses (replace with real addresses to use):
  // nft: MY_NFT_CONTRACT,
  // dao: DAO_GOVERNANCE,

  // Add your own contracts here for Ronin ecosystem:
  // myContract: {
  //   contractAddress: "0x..." as Address,
  //   abi: [...] as const,
  //   supportedNetworks: ["ronin-saigon-testnet"],
  //   contractDescription: "My custom contract on Ronin"
  // }
};

/**
 * How to add a new contract:
 *
 * 1. Get your contract's ABI:
 *    - From your build output (Hardhat/Foundry)
 *    - From a block explorer (Basescan/Etherscan)
 *    - From your contract's deployment artifacts
 *
 * 2. Define the configuration:
 *    const MY_CONTRACT: SmartContractConfig = {
 *      contractAddress: "0x..." as Address,
 *      abi: [...] as const,
 *      supportedNetworks: ["ronin-saigon-testnet"],
 *      contractDescription: "What this contract does"
 *    };
 *
 * 3. Add to exports:
 *    export const SMART_CONTRACT_CONFIGS = {
 *      myContract: MY_CONTRACT,
 *    };
 *
 * 4. The agent will now have these actions available:
 *    - read_contract: Call view/pure functions
 *    - write_contract: Execute state-changing functions
 *    - list_read_functions: See available read operations
 *    - list_write_functions: See available write operations
 *    - get_contract_info: Get contract details
 *
 * 5. Test it:
 *    - Start your app: npm run dev
 *    - Ask the agent: "What contracts can you interact with?"
 *    - Try: "List the read functions for [contract name]"
 *    - Execute: "Call [function name] on [contract]"
 */
