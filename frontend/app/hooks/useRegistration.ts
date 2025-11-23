/**
 * Registration Hook
 *
 * React hook for managing user registration flow
 */

import { useState, useEffect, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import type { Address } from "viem";
import {
  getRegistrationPrice,
  getRegistrationPriceFormatted,
  isUserRegistered,
} from "@/app/lib/contractUtils";
import { DEPLOYED_CONTRACTS } from "@/app/config/contracts";
import MainABI from "@/app/abis/Main.json";

export interface RegistrationState {
  isLoading: boolean;
  isRegistered: boolean;
  registrationPrice: bigint | null;
  registrationPriceFormatted: string | null;
  error: string | null;
  txHash: Address | null;
}

export interface RegistrationActions {
  checkRegistration: () => Promise<void>;
  register: (bigSponsor?: Address, smallSponsor?: Address) => Promise<void>;
  fetchPrice: () => Promise<void>;
}

export function useRegistration(): RegistrationState & RegistrationActions {
  const { address } = useAccount();
  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [state, setState] = useState<RegistrationState>({
    isLoading: false,
    isRegistered: false,
    registrationPrice: null,
    registrationPriceFormatted: null,
    error: null,
    txHash: null,
  });

  const fetchPrice = useCallback(async () => {
    try {
      const [price, priceFormatted] = await Promise.all([
        getRegistrationPrice(),
        getRegistrationPriceFormatted(),
      ]);

      setState((prev) => ({
        ...prev,
        registrationPrice: price,
        registrationPriceFormatted: priceFormatted,
      }));
    } catch (error) {
      console.error("Error fetching registration price:", error);
      setState((prev) => ({
        ...prev,
        error: "Failed to fetch registration price",
      }));
    }
  }, []);

  const checkRegistration = useCallback(async () => {
    if (!address) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const registered = await isUserRegistered(address);
      setState((prev) => ({
        ...prev,
        isRegistered: registered,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error checking registration:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to check registration status",
      }));
    }
  }, [address]);

  const register = useCallback(async (bigSponsor?: Address, smallSponsor?: Address) => {
    console.log('register() called - wallet state:', { address });

    if (!address) {
      setState((prev) => ({
        ...prev,
        error: "No wallet address detected",
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      txHash: null,
    }));

    try {
      // Get registration price
      const registrationPrice = await getRegistrationPrice();

      // Use zero address for optional sponsors
      const zeroAddress = "0x0000000000000000000000000000000000000000" as Address;
      const bigSponsorAddr = bigSponsor || zeroAddress;
      const smallSponsorAddr = smallSponsor || zeroAddress;

      console.log('Calling writeContractAsync...', {
        contract: DEPLOYED_CONTRACTS.main,
        value: registrationPrice.toString(),
        user: address,
        bigSponsor: bigSponsorAddr,
        smallSponsor: smallSponsorAddr,
      });

      // Call contract directly with useWriteContract
      // Ronin Saigon uses 20 gwei gas price (EIP-1559)
      // Gas limit increased to 500k to account for User contract deployment
      const hash = await writeContractAsync({
        address: DEPLOYED_CONTRACTS.main,
        abi: MainABI,
        functionName: "registerUser",
        args: [address, bigSponsorAddr, smallSponsorAddr],
        value: registrationPrice,
        gas: BigInt(500000), // Increased for contract deployment
        maxFeePerGas: BigInt(22000000000), // 22 gwei
        maxPriorityFeePerGas: BigInt(20000000000), // 20 gwei
      });

      console.log('Transaction submitted:', hash);
      setState((prev) => ({ ...prev, txHash: hash }));
    } catch (error) {
      console.error("Error registering user:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to register user",
      }));
    }
  }, [address, writeContractAsync]);

  // Fetch registration price on mount
  useEffect(() => {
    // Delay execution to avoid render phase conflicts
    const timer = setTimeout(() => {
      fetchPrice();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchPrice]);

  // Check registration status when address changes
  useEffect(() => {
    if (address) {
      // Delay execution to avoid render phase conflicts
      const timer = setTimeout(() => {
        checkRegistration();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [address, checkRegistration]);

  // Update registration status when transaction confirms
  useEffect(() => {
    if (isConfirmed) {
      console.log('Transaction confirmed!');
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isRegistered: true,
      }));
    }
  }, [isConfirmed]);

  // Update loading state from wagmi
  useEffect(() => {
    setState((prev) => ({ ...prev, isLoading: isPending }));
  }, [isPending]);

  return {
    ...state,
    checkRegistration,
    register,
    fetchPrice,
  };
}
