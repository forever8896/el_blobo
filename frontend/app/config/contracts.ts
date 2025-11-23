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
  projectRegistry: "0x64f083E11e788c04e8867D9Ac0850D77e46296FD" as Address,
  nativeRewardVault: "0x39224466f23c0D48f3ED96F1E8EF7BE973FaE4bC" as Address,
  users: "0x90113D54142E1aC7EaC2464ac1A1804e4d231e30" as Address,
  main: "0x25332d3C379FCbCdA013695eca078b922E56B3de" as Address,
} as const;

// NOTE: Registration price and vault balance are READ FROM ON-CHAIN via contractUtils.ts
// Do not use hardcoded values - always call getRegistrationPrice() and getTreasuryInfo()
