"use client";

import { m } from "framer-motion";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../context";
import { useAccount } from "wagmi";
import { TantoConnectButton } from "@sky-mavis/tanto-widget";
import { useRegistration } from "@/app/hooks/useRegistration";

export default function DepositPage() {
  const router = useRouter();
  const { updateState } = useOnboarding();
  const { address, isConnected } = useAccount();

  // Debug wallet state
  useEffect(() => {
    console.log('Deposit page - Wallet state:', {
      address,
      isConnected,
      addressType: typeof address,
      addressValue: address
    });
  }, [address, isConnected]);

  // Update wallet address in state as soon as it's connected
  useEffect(() => {
    if (address && isConnected) {
      console.log('Setting walletAddress in onboarding state:', address);
      updateState({ walletAddress: address });
    }
  }, [address, isConnected, updateState]);

  // Real blockchain registration hook
  const {
    isLoading: isRegistering,
    isRegistered,
    registrationPriceFormatted,
    error: registrationError,
    txHash,
    register,
  } = useRegistration();

  // Auto-advance when registration completes
  useEffect(() => {
    if (isRegistered && address) {
      console.log('Registration confirmed on-chain, advancing to interview');

      // Update deposit completed flag (walletAddress is already set by previous effect)
      updateState({
        depositCompleted: true
      });

      // Navigate after delay
      const timer = setTimeout(() => {
        router.push('/onboarding/interview');
      }, 2000);

      return () => clearTimeout(timer);
    }
    // Only depend on isRegistered to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegistered]);

  const handleDeposit = async () => {
    console.log('handleDeposit called with:', { isConnected, address, isRegistered });

    if (!isConnected || !address) {
      alert('❌ WALLET NOT CONNECTED\n\nPlease connect your Ronin wallet to register.');
      return;
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      alert('❌ INVALID WALLET ADDRESS\n\nDetected address: ' + address + '\n\nPlease disconnect and reconnect your wallet.');
      return;
    }

    if (isRegistered) {
      console.log('Already registered, skipping');
      return;
    }

    console.log('Starting on-chain registration...');
    try {
      // Real blockchain registration - no sponsors for now
      await register(undefined, undefined);
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  const handleClearCache = () => {
    console.log('Clearing all wallet cache...');
    // Clear localStorage
    localStorage.clear();
    // Clear sessionStorage
    sessionStorage.clear();
    // Reload page
    window.location.reload();
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 text-center"
    >
      <div className="text-7xl mb-4">🫧</div>

      <div className="max-w-2xl mx-auto space-y-6">
        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl md:text-3xl font-display font-bold text-blob-mint"
        >
          FINANCIAL ALIGNMENT REQUIRED
        </m.p>

        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-blob-peach font-mono"
        >
          &quot;Skin in the game&quot; ensures quality.
        </m.p>

        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-black border-2 border-blob-mint p-8 shadow-[8px_8px_0px_#1E4CDD] inline-block"
        >
          <div className="text-6xl font-bold mb-2 text-blob-mint font-display">
            {registrationPriceFormatted ? `${registrationPriceFormatted} RON` : 'Loading...'}
          </div>
          <p className="text-sm text-blob-peach font-mono">
            REGISTRATION FEE - BLOCKCHAIN VERIFIED
          </p>
        </m.div>
      </div>

      {/* Error Display */}
      {registrationError && (
        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-900/20 border-2 border-red-500 p-4 max-w-md mx-auto"
        >
          <p className="text-red-400 font-mono text-sm">ERROR: {registrationError}</p>
        </m.div>
      )}

      {/* Transaction Hash */}
      {txHash && !isRegistered && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 max-w-md mx-auto"
        >
          <p className="text-sm text-blob-mint font-mono">TRANSACTION SUBMITTED</p>
          <p className="text-xs text-gray-400 font-mono break-all">
            {txHash}
          </p>
          <p className="text-xs text-blob-peach font-mono animate-pulse">AWAITING CONFIRMATION...</p>
        </m.div>
      )}

      {isRegistered ? (
        <m.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
          className="space-y-4"
        >
          <div className="text-6xl">✅</div>
          <p className="text-2xl font-bold text-blob-green font-mono">REGISTRATION CONFIRMED</p>
          <p className="text-lg text-white font-mono">ON-CHAIN VERIFIED</p>
          <p className="text-sm text-gray-400 font-mono">INITIALIZING INTERVIEW...</p>
        </m.div>
      ) : isConnected && address ? (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <p className="text-sm text-blob-green font-mono border border-blob-green inline-block px-2 py-1">
              ✓ WALLET CONNECTED
            </p>
            <p className="text-xs text-gray-400 font-mono">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>
          <br/>
          <button
            onClick={handleDeposit}
            disabled={isRegistering || !isConnected}
            className={`px-12 py-4 border-2 text-xl font-bold font-mono transition-all ${
              isRegistering || !isConnected
                ? 'bg-gray-600 border-gray-500 text-gray-400 cursor-not-allowed'
                : 'bg-blob-cobalt border-blob-mint text-white hover:shadow-[6px_6px_0px_#4FFFB0] hover:-translate-y-1'
            }`}
          >
            {isRegistering ? 'REGISTERING ON-CHAIN...' : 'REGISTER ON-CHAIN'}
          </button>
          <p className="text-xs text-blob-orange font-mono uppercase">
            [ RONIN SAIGON TESTNET - REAL TRANSACTION ]
          </p>
        </m.div>
      ) : (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="space-y-4"
        >
          <TantoConnectButton>
            {({ showModal }) => (
              <m.button
                whileHover={{ scale: 1.05, boxShadow: "6px 6px 0px #1E4CDD" }}
                whileTap={{ scale: 0.95 }}
                onClick={showModal}
                className="px-12 py-4 bg-white text-blob-violet border-2 border-blob-cobalt rounded-none text-xl font-bold transition-all font-mono"
              >
                CONNECT WALLET
              </m.button>
            )}
          </TantoConnectButton>

          {/* Debug: Clear cache button */}
          <button
            onClick={handleClearCache}
            className="text-xs text-gray-500 hover:text-white font-mono underline"
          >
            Clear Wallet Cache & Reload
          </button>
        </m.div>
      )}
    </m.div>
  );
}
