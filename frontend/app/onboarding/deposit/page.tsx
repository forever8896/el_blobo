"use client";

import { m } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../context";
import { useAccount } from "wagmi";
import { TantoConnectButton } from "@sky-mavis/tanto-widget";

export default function DepositPage() {
  const router = useRouter();
  const { updateState } = useOnboarding();
  const { address, isConnected } = useAccount();
  const [depositCompleted, setDepositCompleted] = useState(false);

  const handleDeposit = () => {
    // Mock deposit logic
    setDepositCompleted(true);
    
    // Update context state
    updateState({ 
      walletAddress: address || "",
      depositCompleted: true 
    });

    setTimeout(() => {
      router.push('/onboarding/interview');
    }, 2000);
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
          <div className="text-6xl font-bold mb-2 text-blob-mint font-display">$50</div>
          <p className="text-sm text-blob-peach font-mono">
            REFUNDABLE UPON MISSION COMPLETION
          </p>
        </m.div>
      </div>

      {depositCompleted ? (
        <m.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
          className="space-y-4"
        >
          <div className="text-6xl">✅</div>
          <p className="text-2xl font-bold text-blob-green font-mono">DEPOSIT CONFIRMED</p>
          <p className="text-lg text-white font-mono">INITIALIZING INTERVIEW...</p>
        </m.div>
      ) : isConnected && address ? (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p className="text-sm text-blob-green font-mono border border-blob-green inline-block px-2 py-1">
            CONNECTED: {address.slice(0, 6)}...{address.slice(-4)}
          </p>
          <br/>
          <button
            onClick={handleDeposit}
            className="px-12 py-4 bg-blob-cobalt border-2 border-blob-mint text-white text-xl font-bold hover:shadow-[6px_6px_0px_#4FFFB0] hover:-translate-y-1 transition-all font-mono"
          >
            DEPOSIT $50
          </button>
          <p className="text-xs text-gray-500 font-mono uppercase">[ Testnet Simulation Mode ]</p>
        </m.div>
      ) : (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
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
        </m.div>
      )}
    </m.div>
  );
}
