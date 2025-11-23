"use client";

import { m } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../context";

export default function InterviewPage() {
  const router = useRouter();
  const { state, updateState } = useOnboarding();
  const [responses, setResponses] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guard: Redirect if deposit not completed
  useEffect(() => {
    if (!state.depositCompleted || !state.walletAddress) {
      console.warn('Interview access denied - deposit not completed');
      router.push('/onboarding/deposit');
    }
  }, [state.depositCompleted, state.walletAddress, router]);

  const questions = [
    "QUERY 1: What gets you excited to work on a project?",
    "QUERY 2: What gives you energy?",
    "QUERY 3: What lights a fire under your ass?"
  ];

  const handleComplete = async (finalResponses: string[]) => {
    setIsSubmitting(true);

    // Validate required data before submitting
    if (!state.walletAddress || !state.username) {
      console.error('Missing required data:', { walletAddress: state.walletAddress, username: state.username });
      alert(`Registration failed: Missing required information.\n\nWallet: ${state.walletAddress || 'NOT SET'}\nUsername: ${state.username || 'NOT SET'}\n\nPlease go back and complete the previous steps.`);
      setIsSubmitting(false);
      return;
    }

    try {
      // Register user in database
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: state.walletAddress,
          username: state.username,
          interviewResponses: finalResponses,
          referrerAddress: state.referrerAddress
        })
      });

      const result = await response.json();

      if (result.success) {
        // Save to localStorage for session persistence
        localStorage.setItem('userWallet', state.walletAddress);
        localStorage.setItem('username', state.username);
        localStorage.setItem('onboardingComplete', 'true');

        router.push('/dashboard');
      } else {
        alert(`Registration failed: ${result.message}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error during registration:', error);
      alert('Failed to complete registration. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (!input.trim()) return;

    const newResponses = [...responses, input];
    setResponses(newResponses);
    setInput('');

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Interview complete
      handleComplete(newResponses);
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
        <p className="text-lg text-blob-peach font-mono">Subject: {state.username}</p>
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
          disabled={!input.trim() || isSubmitting}
          className={`w-full py-4 border-2 text-lg font-bold font-mono transition-all ${
            input.trim() && !isSubmitting
              ? 'bg-blob-cobalt border-blob-mint text-white hover:shadow-[4px_4px_0px_#4FFFB0] hover:-translate-y-1'
              : 'bg-gray-900 border-gray-700 text-gray-600 cursor-not-allowed'
          }`}
        >
          {isSubmitting 
            ? 'INITIALIZING PROTOCOL...' 
            : currentQuestion < questions.length - 1 ? 'SUBMIT & CONTINUE' : 'FINALIZE ASSESSMENT'}
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
