"use client";

import { m } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../context";

export default function IdentityPage() {
  const router = useRouter();
  const { state, updateState } = useOnboarding();
  const [username, setUsername] = useState(state.username || "");

  const isValid = username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);

  const handleNext = () => {
    if (isValid) {
      updateState({ username });
      router.push('/onboarding/mission');
    }
  };

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
          onClick={() => router.back()}
          className="px-8 py-3 border-2 border-gray-600 text-gray-400 hover:border-white hover:text-white font-mono font-semibold transition-all"
        >
          BACK
        </button>
        <button
          onClick={handleNext}
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
