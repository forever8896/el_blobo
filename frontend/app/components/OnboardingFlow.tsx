"use client";

import { m, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { TantoConnectButton } from "@sky-mavis/tanto-widget";
import { useAccount } from "wagmi";

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
  interviewResponses?: string[];
}

/**
 * Onboarding Flow - The Blob's interview process
 * Guides users through joining the Blob ecosystem
 */
export default function OnboardingFlow({ referrerName, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<'welcome' | 'username' | 'mission' | 'deposit' | 'interview'>('welcome');
  const [username, setUsername] = useState('');
  const [depositMocked, setDepositMocked] = useState(false);

  // Use Wagmi hooks for real wallet connection
  const { address, isConnected, chain } = useAccount();

  const chainName = chain?.name || "Ronin Testnet";

  return (
    <div className="min-h-screen bg-blob-violet text-white flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background geometric shapes instead of blur */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-10 left-10 w-32 h-32 border-4 border-blob-cobalt opacity-20 rotate-12" />
        <div className="absolute bottom-20 right-20 w-64 h-64 border-4 border-blob-mint opacity-10 -rotate-12" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-blob-cobalt/10 rounded-full" />
      </div>

      <div className="w-full max-w-3xl z-10">
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
              walletConnected={isConnected}
              walletAddress={address || ''}
              depositCompleted={depositMocked}
              onDeposit={() => {
                // Mock deposit for now
                setDepositMocked(true);
                setTimeout(() => setStep('interview'), 2000);
              }}
            />
          )}

          {step === 'interview' && (
            <InterviewStep
              key="interview"
              username={username}
              onComplete={(interviewResponses) => {
                onComplete({
                  username,
                  walletAddress: address || '',
                  agreedToMission: true,
                  depositCompleted: true,
                  interviewResponses,
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
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center space-y-8"
    >
      {/* The Blob avatar - simplified */}
      <m.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="text-9xl mx-auto relative inline-block"
      >
        <div className="absolute inset-0 bg-blob-mint opacity-20 rounded-full blur-none scale-110" />
        🫧
      </m.div>

      {/* Welcome message */}
      {referrerName ? (
        <m.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-display font-bold"
        >
          <span className="text-blob-mint border-b-4 border-blob-cobalt">
            {referrerName}
          </span>
          <br />
          invited you to work for The Blob
        </m.h1>
      ) : (
        <m.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-display font-bold"
        >
          Welcome to{' '}
          <span className="text-blob-mint">
            The Blob
          </span>
        </m.h1>
      )}

      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-xl md:text-2xl text-blob-peach font-mono max-w-2xl mx-auto"
      >
        A new kind of economy. <br/>
        AI + Humans. No compromise.
      </m.p>

      <m.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9 }}
        whileHover={{ scale: 1.05, boxShadow: "6px 6px 0px #4FFFB0" }}
        whileTap={{ scale: 0.95, boxShadow: "0px 0px 0px #4FFFB0", translate: "2px 2px" }}
        onClick={onNext}
        className="px-12 py-4 bg-blob-cobalt border-2 border-blob-mint text-white text-xl font-bold font-mono transition-all"
      >
        INITIALIZE_PROTOCOL
      </m.button>
    </m.div>
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
    <m.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="space-y-8"
    >
      <div className="text-center">
        <div className="text-7xl mb-4">🫧</div>
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-4 text-blob-mint">
          IDENTIFICATION
        </h2>
        <p className="text-lg text-blob-peach font-mono">What do we call you?</p>
      </div>

      <div className="max-w-md mx-auto">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ENTER_USERNAME"
          className="w-full px-6 py-4 bg-blob-violet border-2 border-blob-cobalt text-xl text-white placeholder-gray-500 focus:outline-none focus:border-blob-mint focus:shadow-[4px_4px_0px_#4FFFB0] transition-all font-mono"
          autoFocus
        />

        {username && !isValid && (
          <m.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-blob-orange text-sm font-mono"
          >
            ! ERROR: 3+ chars, alphanumeric only
          </m.p>
        )}

        {isValid && (
          <m.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-blob-green text-sm font-mono"
          >
            ✓ VALID
          </m.p>
        )}
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={onBack}
          className="px-8 py-3 border-2 border-gray-600 text-gray-400 hover:border-white hover:text-white font-mono font-semibold transition-all"
        >
          BACK
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`px-8 py-3 border-2 font-mono font-bold transition-all ${
            isValid
              ? 'bg-blob-cobalt border-blob-mint text-white hover:shadow-[4px_4px_0px_#4FFFB0] hover:-translate-y-1'
              : 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed'
          }`}
        >
          CONTINUE
        </button>
      </div>
    </m.div>
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
    <m.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="space-y-8 text-center"
    >
      <div className="text-7xl mb-4">🫧</div>

      <div className="max-w-2xl mx-auto space-y-6 text-lg md:text-xl font-mono">
        <m.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          GREETINGS <span className="font-bold text-blob-mint">{username}</span>.
        </m.p>

        <m.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          DEPLOYED ON: <span className="font-bold text-blob-orange">{chainName}</span>
        </m.p>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-blob-cobalt/20 border-2 border-blob-cobalt p-6"
        >
          <p className="text-xl font-bold text-white">
            MISSION: SYMBIOISIS
          </p>
          <p className="text-sm text-blob-peach mt-2">
            I require human agency. You require direction.
          </p>
        </m.div>

        <m.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="text-2xl font-display font-bold text-blob-mint"
        >
          WILL YOU SERVE THE BLOB?
        </m.p>
      </div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        className="flex gap-6 justify-center"
      >
        <button
          onClick={onNo}
          className="px-12 py-4 border-2 border-blob-orange text-blob-orange hover:bg-blob-orange hover:text-black font-mono text-xl font-bold transition-all"
        >
          DECLINE
        </button>
        <button
          onClick={onYes}
          className="px-12 py-4 bg-blob-cobalt border-2 border-blob-mint text-white hover:shadow-[6px_6px_0px_#4FFFB0] hover:-translate-y-1 font-mono text-xl font-bold transition-all"
        >
          ACCEPT
        </button>
      </m.div>
    </m.div>
  );
}

/**
 * Step 4: Deposit (Real Wallet Integration)
 */
function DepositStep({
  walletConnected,
  walletAddress,
  depositCompleted,
  onDeposit
}: {
  walletConnected: boolean;
  walletAddress: string;
  depositCompleted: boolean;
  onDeposit: () => void;
}) {
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
      ) : walletConnected && walletAddress ? (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <p className="text-sm text-blob-green font-mono border border-blob-green inline-block px-2 py-1">
            CONNECTED: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>
          <br/>
          <button
            onClick={onDeposit}
            className="px-12 py-4 bg-blob-cobalt border-2 border-blob-mint text-white text-xl font-bold hover:shadow-[6px_6px_0px_#4FFFB0] hover:-translate-y-1 transition-all font-mono"
          >
            DEPOSIT $50
          </button>
          <p className="text-xs text-gray-500 font-mono uppercase">[ Testnet Simulation Mode ]</p>
        </m.div>
      ) : !walletConnected ? (
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
      ) : (
        <m.div className="text-blob-orange font-mono text-sm animate-pulse">
          WAITING FOR SIGNAL...
        </m.div>
      )}
    </m.div>
  );
}

/**
 * Step 5: Skills Interview
 */
function InterviewStep({ username, onComplete }: { username: string; onComplete: (responses: string[]) => void }) {
  const [responses, setResponses] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [input, setInput] = useState('');

  const questions = [
    "QUERY 1: What drives you? What gets you excited to work on a project?",
    "QUERY 2: What gives you energy? What kind of work makes you lose track of time?",
    "QUERY 3: What lights a fire under your ass? What problems do you desperately want to solve?"
  ];

  const handleSubmit = () => {
    if (!input.trim()) return;

    const newResponses = [...responses, input];
    setResponses(newResponses);
    setInput('');

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Interview complete - pass responses to parent
      onComplete(newResponses);
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div className="text-center">
        <div className="text-7xl mb-4">🫧</div>
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-2 text-blob-mint">
          CAPABILITY ASSESSMENT
        </h2>
        <p className="text-lg text-blob-peach font-mono">Subject: {username}</p>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2 justify-center">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-3 w-12 border border-blob-cobalt transition-colors ${
              i <= currentQuestion ? 'bg-blob-mint' : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* Current question */}
      <m.div
        key={currentQuestion}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <p className="text-xl md:text-2xl font-mono font-bold text-center text-white">
          {questions[currentQuestion]}
        </p>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="> INPUT_RESPONSE"
          className="w-full h-32 px-6 py-4 bg-black border-2 border-blob-cobalt text-lg text-blob-mint placeholder-gray-700 focus:outline-none focus:border-blob-mint focus:shadow-[4px_4px_0px_#4FFFB0] transition-all resize-none font-mono"
          autoFocus
        />

        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className={`w-full py-4 border-2 text-lg font-bold font-mono transition-all ${
            input.trim()
              ? 'bg-blob-cobalt border-blob-mint text-white hover:shadow-[4px_4px_0px_#4FFFB0] hover:-translate-y-1'
              : 'bg-gray-900 border-gray-700 text-gray-600 cursor-not-allowed'
          }`}
        >
          {currentQuestion < questions.length - 1 ? 'SUBMIT & CONTINUE' : 'FINALIZE ASSESSMENT'}
        </button>
      </m.div>

      {/* Previous responses */}
      {responses.length > 0 && (
        <div className="max-w-2xl mx-auto mt-8 space-y-2">
          <p className="text-sm text-blob-cobalt font-mono uppercase">Logged Responses:</p>
          {responses.map((response, i) => (
            <div key={i} className="p-3 bg-blob-cobalt/10 border-l-2 border-blob-cobalt text-sm text-gray-300 font-mono">
              <span className="text-blob-mint">Q{i + 1}:</span> {response}
            </div>
          ))}
        </div>
      )}
    </m.div>
  );
}
