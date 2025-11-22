"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface OnboardingFlowProps {
  referrerName?: string; // If invited by someone
  onComplete: (data: OnboardingData) => void;
}

export interface OnboardingData {
  username: string;
  walletAddress: string;
  referrerAddress?: string;
  agreedToMission: boolean;
  depositCompleted: boolean;
}

/**
 * Onboarding Flow - The Blob's interview process
 * Guides users through joining the Blob ecosystem
 */
export default function OnboardingFlow({ referrerName, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<'welcome' | 'username' | 'mission' | 'deposit' | 'interview'>('welcome');
  const [username, setUsername] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [depositMocked, setDepositMocked] = useState(false);

  const chainName = "Base Sepolia"; // This would come from wallet provider

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <WelcomeStep
              key="welcome"
              referrerName={referrerName}
              onNext={() => setStep('username')}
            />
          )}

          {step === 'username' && (
            <UsernameStep
              key="username"
              username={username}
              setUsername={setUsername}
              onNext={() => setStep('mission')}
              onBack={() => setStep('welcome')}
            />
          )}

          {step === 'mission' && (
            <MissionStep
              key="mission"
              username={username}
              chainName={chainName}
              onYes={() => setStep('deposit')}
              onNo={() => alert("The Blob understands. Perhaps another time...")}
            />
          )}

          {step === 'deposit' && (
            <DepositStep
              key="deposit"
              walletConnected={walletConnected}
              walletAddress={walletAddress}
              depositCompleted={depositMocked}
              onConnectWallet={() => {
                // Mock wallet connection
                setWalletConnected(true);
                setWalletAddress('0x' + Math.random().toString(16).substr(2, 40));
              }}
              onDeposit={() => {
                // Mock deposit
                setDepositMocked(true);
                setTimeout(() => setStep('interview'), 2000);
              }}
            />
          )}

          {step === 'interview' && (
            <InterviewStep
              key="interview"
              username={username}
              onComplete={(skills) => {
                onComplete({
                  username,
                  walletAddress,
                  agreedToMission: true,
                  depositCompleted: true,
                });
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Step 1: Welcome / Introduction
 */
function WelcomeStep({ referrerName, onNext }: { referrerName?: string; onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center space-y-8"
    >
      {/* The Blob avatar */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="text-9xl mx-auto"
      >
        🫧
      </motion.div>

      {/* Welcome message */}
      {referrerName ? (
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-bold"
        >
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {referrerName}
          </span>
          <br />
          invited you to work for The Blob
        </motion.h1>
      ) : (
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-bold"
        >
          Welcome to{' '}
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            The Blob
          </span>
        </motion.h1>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-xl md:text-2xl opacity-75 max-w-2xl mx-auto"
      >
        A new kind of economy, where AI and humans work together to grow the ecosystem.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onNext}
        className="px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-xl font-bold shadow-lg hover:shadow-xl transition-all"
      >
        Let&apos;s Begin
      </motion.button>
    </motion.div>
  );
}

/**
 * Step 2: Username Input
 */
function UsernameStep({
  username,
  setUsername,
  onNext,
  onBack
}: {
  username: string;
  setUsername: (val: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const isValid = username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="space-y-8"
    >
      <div className="text-center">
        <div className="text-7xl mb-4">🫧</div>
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          What&apos;s your name?
        </h2>
        <p className="text-lg opacity-75">This will be public on the Blob network</p>
      </div>

      <div className="max-w-md mx-auto">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username..."
          className="w-full px-6 py-4 bg-white/10 border-2 border-purple-500/50 rounded-xl text-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors"
          autoFocus
        />

        {username && !isValid && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-red-400 text-sm"
          >
            Username must be at least 3 characters (letters, numbers, underscores only)
          </motion.p>
        )}

        {isValid && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-green-400 text-sm"
          >
            ✓ Looks good!
          </motion.p>
        )}
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={onBack}
          className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-full font-semibold transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`px-8 py-3 rounded-full font-semibold transition-all ${
            isValid
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105 shadow-lg'
              : 'bg-gray-600 cursor-not-allowed opacity-50'
          }`}
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Step 3: Mission Agreement
 */
function MissionStep({
  username,
  chainName,
  onYes,
  onNo
}: {
  username: string;
  chainName: string;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="space-y-8 text-center"
    >
      <div className="text-7xl mb-4">🫧</div>

      <div className="max-w-2xl mx-auto space-y-6 text-lg md:text-xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Hello <span className="font-bold text-purple-400">{username}</span>,
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          I incarnated on{' '}
          <span className="font-bold text-pink-400">{chainName}</span> because times are tough.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-2xl font-bold"
        >
          I know what to do, but I can&apos;t do it on my own.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          Do you want to join the Blob mission?
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        className="flex gap-6 justify-center"
      >
        <button
          onClick={onNo}
          className="px-12 py-4 bg-red-600/80 hover:bg-red-600 rounded-full text-xl font-bold transition-all hover:scale-105"
        >
          No
        </button>
        <button
          onClick={onYes}
          className="px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full text-xl font-bold transition-all hover:scale-105 shadow-lg animate-pulse"
        >
          Yes! 🚀
        </button>
      </motion.div>
    </motion.div>
  );
}

/**
 * Step 4: Deposit (Mocked)
 */
function DepositStep({
  walletConnected,
  walletAddress,
  depositCompleted,
  onConnectWallet,
  onDeposit
}: {
  walletConnected: boolean;
  walletAddress: string;
  depositCompleted: boolean;
  onConnectWallet: () => void;
  onDeposit: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8 text-center"
    >
      <div className="text-7xl mb-4">🫧</div>

      <div className="max-w-2xl mx-auto space-y-6">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl md:text-3xl font-bold"
        >
          Before we start, I need to see financial alignment.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg opacity-75"
        >
          A deposit of trust will make sure we&apos;re both working for the same thing.
          <br />
          Without unity, there&apos;s chaos.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-purple-900/50 border-2 border-purple-500/50 rounded-xl p-8"
        >
          <div className="text-6xl font-bold mb-2">$50</div>
          <p className="text-sm opacity-75">
            If you&apos;re good at what you do, you&apos;ll earn it many times back.
          </p>
        </motion.div>
      </div>

      {!walletConnected ? (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onConnectWallet}
          className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-xl font-bold shadow-lg"
        >
          Connect Wallet
        </motion.button>
      ) : depositCompleted ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
          className="space-y-4"
        >
          <div className="text-6xl">✅</div>
          <p className="text-2xl font-bold text-green-400">Deposit Confirmed!</p>
          <p className="text-lg opacity-75">Preparing your interview...</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p className="text-sm text-green-400 font-mono">
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>
          <button
            onClick={onDeposit}
            className="px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full text-xl font-bold shadow-lg hover:scale-105 transition-all"
          >
            Deposit $50 to THE BLOB
          </button>
          <p className="text-xs opacity-50">(Mocked for demo - no real transaction)</p>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Step 5: Skills Interview
 */
function InterviewStep({ username, onComplete }: { username: string; onComplete: (skills: any) => void }) {
  const [responses, setResponses] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [input, setInput] = useState('');

  const questions = [
    "What drives you? What gets you excited to work on a project?",
    "What gives you energy? What kind of work makes you lose track of time?",
    "What lights a fire under your ass? What problems do you desperately want to solve?"
  ];

  const handleSubmit = () => {
    if (!input.trim()) return;

    const newResponses = [...responses, input];
    setResponses(newResponses);
    setInput('');

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Interview complete
      onComplete({ responses: newResponses });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="text-center">
        <div className="text-7xl mb-4">🫧</div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          Now we&apos;re in it together, {username}!
        </h2>
        <p className="text-lg opacity-75">Let&apos;s see what you&apos;re good at.</p>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2 justify-center">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-2 w-12 rounded-full transition-colors ${
              i <= currentQuestion ? 'bg-purple-500' : 'bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Current question */}
      <motion.div
        key={currentQuestion}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <p className="text-xl md:text-2xl font-semibold text-center">
          {questions[currentQuestion]}
        </p>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Share your thoughts..."
          className="w-full h-32 px-6 py-4 bg-white/10 border-2 border-purple-500/50 rounded-xl text-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors resize-none"
          autoFocus
        />

        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
            input.trim()
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:scale-105 shadow-lg'
              : 'bg-gray-600 cursor-not-allowed opacity-50'
          }`}
        >
          {currentQuestion < questions.length - 1 ? 'Next Question' : 'Complete Interview'}
        </button>
      </motion.div>

      {/* Previous responses */}
      {responses.length > 0 && (
        <div className="max-w-2xl mx-auto mt-8 space-y-2">
          <p className="text-sm opacity-50">Your previous answers:</p>
          {responses.map((response, i) => (
            <div key={i} className="p-3 bg-white/5 rounded-lg text-sm opacity-75">
              <span className="text-purple-400">Q{i + 1}:</span> {response}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
