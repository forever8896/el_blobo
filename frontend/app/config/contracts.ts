/**
 * Contract Deployment Configuration
 *
 * Ronin Saigon Testnet Deployments
 */

import type { Address } from "viem";

export const RONIN_SAIGON_TESTNET = {
  chainId: 2021,
  name: "Ronin Saigon Testnet",
  rpcUrl: "https://saigon-testnet.roninchain.com/rpc",
} as const;

export const DEPLOYED_CONTRACTS = {
  deployer: "0x848a2C9C56c9073DB4813c7D80Ac4B324a5A4361" as Address,
  projectRegistry: "0x47b19753aa87E7C6443Ff428d99C4604B32795c2" as Address,
  nativeRewardVault: "0x027a446e021f0d3587Bad84a996BCc910cC55259" as Address,
  users: "0x84c573F85DBC029242f3e88f8656aA03d06657dE" as Address,
  main: "0xD1460312bF580271bb1674c0e8eC41Db4cADb9fD" as Address,
} as const;

// NOTE: Registration price and vault balance are READ FROM ON-CHAIN via contractUtils.ts
// Do not use hardcoded values - always call getRegistrationPrice() and getTreasuryInfo()
