"use client";

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { TestJobFlow } from '@/app/components/TestJobFlow';
import { TantoConnectButton } from '@sky-mavis/tanto-widget';
import { m } from 'framer-motion';

export default function TestSubmissionPage() {
  const { address, isConnected } = useAccount();
  const [username, setUsername] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      if (!address) {
        setIsLoading(false);
        return;
      }

      try {
        // Try to get username from localStorage first
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) {
          setUsername(storedUsername);
          setIsLoading(false);
          return;
        }

        // Otherwise fetch from API
        const response = await fetch(`/api/users/profile?walletAddress=${address}`);
        const data = await response.json();

        if (data.success && data.user) {
          setUsername(data.user.username || 'Anonymous');
          localStorage.setItem('username', data.user.username || 'Anonymous');
        } else {
          setUsername('Anonymous');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setUsername('Anonymous');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [address]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-blob-violet flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-pulse">🫧</div>
          <p className="text-xl text-blob-mint font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-blob-violet flex items-center justify-center p-6">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-2xl"
        >
          <div className="text-8xl mb-4">🫧</div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-blob-mint">
            TEST SUBMISSION
          </h1>
          <p className="text-xl text-blob-peach font-mono">
            Connect your wallet to test The Blob&apos;s AI Council
          </p>
          <TantoConnectButton>
            {({ showModal }) => (
              <m.button
                whileHover={{ scale: 1.05, boxShadow: "6px 6px 0px #4FFFB0" }}
                whileTap={{ scale: 0.95 }}
                onClick={showModal}
                className="px-12 py-4 bg-blob-cobalt border-2 border-blob-mint text-white text-xl font-bold font-mono transition-all"
              >
                CONNECT WALLET
              </m.button>
            )}
          </TantoConnectButton>
        </m.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blob-violet py-12 px-6">
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* User Info */}
        <div className="text-center mb-8">
          <p className="text-sm text-gray-400 font-mono">Logged in as</p>
          <p className="text-lg text-white font-mono font-bold">{username}</p>
          <p className="text-xs text-gray-500 font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>

        {/* Test Job Flow Component - Uses real agent infrastructure */}
        <TestJobFlow userAddress={address} username={username} />

        {/* Info Box */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 bg-black/50 border-2 border-blob-cobalt p-6 rounded max-w-2xl mx-auto"
        >
          <h3 className="text-lg font-bold text-blob-mint font-mono mb-3">
            ℹ️ TEST MODE - USING REAL INFRASTRUCTURE
          </h3>
          <ul className="space-y-2 text-sm text-gray-300 font-mono">
            <li>• 💬 Uses the REAL /api/agent route (same as dashboard)</li>
            <li>• 📊 Loads your actual profile, skills & chat history from DB</li>
            <li>• 💰 Shows live vault balance from blockchain</li>
            <li>• 🤖 AgentKit with full tool access (wallet, contracts, etc.)</li>
            <li>• 🎯 Ask the agent for work - it will generate tasks for you</li>
            <li>• ✅ Accept a job to start the test workflow</li>
            <li>• 📤 Submit your work (can use fake URLs for testing)</li>
            <li>• ⚖️ 3 AI judges evaluate using REAL council route:</li>
            <li className="ml-6">- VALIDATOR-PRIME (OpenAI GPT-4)</li>
            <li className="ml-6">- CHAOS-ARBITER (Grok/X.AI)</li>
            <li className="ml-6">- IMPACT-SAGE (Google Gemini 2.5)</li>
            <li>• 💸 Votes saved to real database</li>
            <li className="mt-3 text-blob-peach font-bold">This IS the real system - just without on-chain job contracts!</li>
          </ul>
        </m.div>
      </m.div>
    </div>
  );
}
