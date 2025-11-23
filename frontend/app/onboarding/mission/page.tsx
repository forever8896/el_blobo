"use client";

import { m } from "framer-motion";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../context";
import { useAccount } from "wagmi";

export default function MissionPage() {
  const router = useRouter();
  const { state, updateState } = useOnboarding();
  const { chain } = useAccount();
  const chainName = chain?.name || "Ronin Testnet";

  const handleAccept = () => {
    updateState({ agreedToMission: true });
    router.push('/onboarding/deposit');
  };

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
          GREETINGS <span className="font-bold text-blob-mint">{state.username || "USER"}</span>.
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
          onClick={() => alert("The Blob understands. Perhaps another time...")}
          className="px-12 py-4 border-2 border-blob-orange text-blob-orange hover:bg-blob-orange hover:text-black font-mono text-xl font-bold transition-all"
        >
          DECLINE
        </button>
        <button
          onClick={handleAccept}
          className="px-12 py-4 bg-blob-cobalt border-2 border-blob-mint text-white hover:shadow-[6px_6px_0px_#4FFFB0] hover:-translate-y-1 font-mono text-xl font-bold transition-all"
        >
          ACCEPT
        </button>
      </m.div>
    </m.div>
  );
}
