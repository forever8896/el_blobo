/**
 * Example: Using Smart Contract Action Provider with a Custom Contract
 *
 * This example demonstrates how to create an action provider for a more
 * complex custom smart contract with various function types.
 */

import { smartContractActionProvider } from "../smartContractActionProvider";

/**
 * Example: A simple DAO voting contract
 */
const DAO_VOTING_ABI = [
  // Read functions
  {
    type: "function",
    name: "proposalCount",
    inputs: [],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProposal",
    inputs: [{ type: "uint256", name: "proposalId" }],
    outputs: [
      { type: "string", name: "description" },
      { type: "uint256", name: "votesFor" },
      { type: "uint256", name: "votesAgainst" },
      { type: "bool", name: "executed" },
      { type: "uint256", name: "deadline" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasVoted",
    inputs: [
      { type: "uint256", name: "proposalId" },
      { type: "address", name: "voter" },
    ],
    outputs: [{ type: "bool", name: "" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "votingPower",
    inputs: [{ type: "address", name: "account" }],
    outputs: [{ type: "uint256", name: "" }],
    stateMutability: "view",
  },

  // Write functions
  {
    type: "function",
    name: "createProposal",
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
    name: "executeProposal",
    inputs: [{ type: "uint256", name: "proposalId" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "delegate",
    inputs: [{ type: "address", name: "delegatee" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * Create action provider for DAO voting contract
 */
export const daoVotingActionProvider = smartContractActionProvider({
  contractAddress: "0x0000000000000000000000000000000000000000", // Replace with actual address
  abi: DAO_VOTING_ABI,
  supportedNetworks: ["base-sepolia"], // Deploy on testnet first
  contractDescription: "DAO Voting Contract - Create proposals, vote, and execute decisions",
});

/**
 * Example: NFT Marketplace Contract
 */
const NFT_MARKETPLACE_ABI = [
  // Read functions
  {
    type: "function",
    name: "getListing",
    inputs: [
      { type: "address", name: "nftAddress" },
      { type: "uint256", name: "tokenId" },
    ],
    outputs: [
      { type: "uint256", name: "price" },
      { type: "address", name: "seller" },
      { type: "bool", name: "active" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getActiveListings",
    inputs: [{ type: "uint256", name: "offset" }, { type: "uint256", name: "limit" }],
    outputs: [{ type: "tuple[]", name: "listings" }],
    stateMutability: "view",
  },

  // Write functions
  {
    type: "function",
    name: "listNFT",
    inputs: [
      { type: "address", name: "nftAddress" },
      { type: "uint256", name: "tokenId" },
      { type: "uint256", name: "price" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "buyNFT",
    inputs: [
      { type: "address", name: "nftAddress" },
      { type: "uint256", name: "tokenId" },
    ],
    outputs: [],
    stateMutability: "payable", // Accepts ETH payment
  },
  {
    type: "function",
    name: "cancelListing",
    inputs: [
      { type: "address", name: "nftAddress" },
      { type: "uint256", name: "tokenId" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updatePrice",
    inputs: [
      { type: "address", name: "nftAddress" },
      { type: "uint256", name: "tokenId" },
      { type: "uint256", name: "newPrice" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

/**
 * Create action provider for NFT marketplace
 */
export const nftMarketplaceActionProvider = smartContractActionProvider({
  contractAddress: "0x0000000000000000000000000000000000000000", // Replace with actual address
  abi: NFT_MARKETPLACE_ABI,
  supportedNetworks: ["base-mainnet", "base-sepolia"],
  contractDescription: "NFT Marketplace - List, buy, and sell NFTs",
});

/**
 * Example usage in AgentKit setup:
 *
 * ```typescript
 * import { AgentKit } from "@coinbase/agentkit";
 * import {
 *   daoVotingActionProvider,
 *   nftMarketplaceActionProvider
 * } from "./examples/custom-contract-example";
 *
 * const agentkit = await AgentKit.from({
 *   walletProvider,
 *   actionProviders: [
 *     daoVotingActionProvider,
 *     nftMarketplaceActionProvider,
 *     // ... other providers
 *   ],
 * });
 * ```
 *
 * Example conversations:
 *
 * DAO Voting:
 * -----------
 * User: "How many proposals exist?"
 * Agent: [Calls read_contract with functionName: "proposalCount"]
 *
 * User: "Show me proposal 1"
 * Agent: [Calls read_contract with functionName: "getProposal", args: ["1"]]
 *
 * User: "Vote yes on proposal 1"
 * Agent: [Calls write_contract with functionName: "vote", args: ["1", true]]
 *
 * User: "Create a proposal to increase treasury allocation"
 * Agent: [Calls write_contract with functionName: "createProposal",
 *         args: ["Increase treasury allocation to 50%", "604800"]]
 *
 * NFT Marketplace:
 * ----------------
 * User: "List my NFT for sale"
 * Agent: "What's the NFT contract address and token ID?"
 * User: "0xabc... token 123 for 0.5 ETH"
 * Agent: [Calls write_contract with functionName: "listNFT",
 *         args: ["0xabc...", "123", "500000000000000000"]]
 *
 * User: "Buy the NFT at 0xdef... token 456"
 * Agent: [First calls read_contract to get price, then calls write_contract
 *         with functionName: "buyNFT", args: ["0xdef...", "456"], value: "0.5"]
 */
