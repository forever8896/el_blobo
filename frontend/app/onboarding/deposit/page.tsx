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
      className="space-y-10 text-center"
    >
      <div className="max-w-3xl mx-auto space-y-8">
        <m.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h1 className="text-3xl md:text-5xl font-black font-mono text-blob-mint text-balance leading-tight">
            FINANCIAL ALIGNMENT<br/>REQUIRED
          </h1>

          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-blob-peach/80 font-mono text-balance"
          >
            &quot;Skin in the game&quot; ensures quality.
          </m.p>
        </m.div>

        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          className="bg-gradient-to-br from-black to-blob-violet/10 border-4 border-blob-mint p-12 shadow-[12px_12px_0px_#1E4CDD] inline-block hover:shadow-[16px_16px_0px_#1E4CDD] transition-all duration-300"
        >
          <div className="text-7xl md:text-8xl font-black mb-4 text-blob-mint font-mono tracking-tight">
            {registrationPriceFormatted ? `${registrationPriceFormatted}` : 'Loading...'}
            <span className="text-5xl md:text-6xl ml-3">RON</span>
          </div>
          <div className="h-1 w-32 bg-blob-cobalt mx-auto mb-4"></div>
          <p className="text-sm md:text-base text-blob-peach/90 font-mono tracking-wider">
            REGISTRATION FEE · BLOCKCHAIN VERIFIED
          </p>
        </m.div>
      </div>

      {/* Error Display */}
      {registrationError && (
        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-950/40 border-3 border-red-500 p-6 max-w-lg mx-auto backdrop-blur-sm"
        >
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-red-400 font-mono text-base font-bold">ERROR: {registrationError}</p>
        </m.div>
      )}

      {/* Transaction Hash - Enhanced waiting state */}
      {txHash && !isRegistered && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-2xl mx-auto"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-blob-mint/5 blur-xl animate-pulse"></div>
            <div className="relative bg-black/60 border-2 border-blob-mint/50 p-8 backdrop-blur-sm">
              <m.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-blob-mint/30 border-t-blob-mint rounded-full mx-auto mb-6"
              />

              <p className="text-lg md:text-xl text-blob-mint font-mono font-bold mb-4">
                TRANSACTION SUBMITTED
              </p>

              <div className="bg-blob-violet/10 border border-blob-mint/30 p-4 mb-4">
                <p className="text-xs text-gray-500 font-mono mb-1">TX HASH</p>
                <p className="text-xs md:text-sm text-blob-mint/70 font-mono break-all">
                  {txHash}
                </p>
              </div>

              <m.p
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-base md:text-lg text-blob-peach font-mono font-bold"
              >
                ⏳ AWAITING BLOCKCHAIN CONFIRMATION...
              </m.p>

              <p className="text-xs text-gray-500 font-mono mt-4">
                This usually takes 10-30 seconds
              </p>
            </div>
          </div>
        </m.div>
      )}

      {isRegistered ? (
        <m.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="space-y-6"
        >
          <m.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-8xl"
          >
            ✅
          </m.div>
          <div className="bg-blob-green/10 border-2 border-blob-green p-8 inline-block shadow-[8px_8px_0px_rgba(79,255,176,0.3)]">
            <p className="text-3xl md:text-4xl font-bold text-blob-green font-mono mb-2">
              REGISTRATION CONFIRMED
            </p>
            <div className="h-1 w-24 bg-blob-green mx-auto mb-3"></div>
            <p className="text-lg md:text-xl text-white font-mono mb-2">ON-CHAIN VERIFIED</p>
            <m.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-sm text-gray-400 font-mono"
            >
              INITIALIZING INTERVIEW...
            </m.p>
          </div>
        </m.div>
      ) : isConnected && address ? (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-blob-green/10 border-2 border-blob-green px-4 py-2">
              <span className="text-blob-green text-lg">✓</span>
              <p className="text-sm md:text-base text-blob-green font-mono font-bold">
                WALLET CONNECTED
              </p>
            </div>
            <p className="text-sm text-gray-400 font-mono bg-black/40 border border-gray-700 inline-block px-4 py-2">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>

          {/* Only show register button if not awaiting confirmation */}
          {!txHash && (
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              <m.button
                whileHover={{ scale: 1.03, boxShadow: "8px 8px 0px #4FFFB0" }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDeposit}
                disabled={isRegistering || !isConnected}
                className={`px-16 py-5 border-4 text-xl md:text-2xl font-bold font-mono transition-all ${
                  isRegistering || !isConnected
                    ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                    : 'bg-blob-cobalt border-blob-mint text-white shadow-[6px_6px_0px_#4FFFB0]'
                }`}
              >
                {isRegistering ? '⏳ REGISTERING...' : '🚀 REGISTER ON-CHAIN'}
              </m.button>
              <div className="inline-flex items-center gap-2 text-blob-orange/70">
                <div className="w-2 h-2 bg-blob-orange rounded-full animate-pulse"></div>
                <p className="text-xs md:text-sm font-mono font-bold tracking-wider">
                  RONIN SAIGON TESTNET · REAL TRANSACTION
                </p>
              </div>
            </m.div>
          )}
        </m.div>
      ) : (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6 flex flex-col items-center"
        >
          <TantoConnectButton>
            {({ showModal }) => (
              <m.button
                whileHover={{ scale: 1.05, boxShadow: "10px 10px 0px #1E4CDD" }}
                whileTap={{ scale: 0.95 }}
                onClick={showModal}
                className="px-16 py-5 bg-white text-blob-violet border-4 border-blob-cobalt text-2xl font-black transition-all font-mono shadow-[6px_6px_0px_#1E4CDD]"
              >
                🔗 CONNECT WALLET
              </m.button>
            )}
          </TantoConnectButton>

          <p className="text-xs text-gray-600 font-mono">
            Connect your Ronin wallet to continue
          </p>

          {/* Debug: Clear cache button */}
          <button
            onClick={handleClearCache}
            className="text-xs text-gray-600 hover:text-gray-400 font-mono underline"
          >
            Clear Wallet Cache & Reload
          </button>
        </m.div>
      )}
    </m.div>
  );
}
