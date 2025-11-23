"use client";

import { m } from "framer-motion";
import { useRouter } from "next/navigation";
import { useOnboarding } from "../context";
import Image from "next/image";

export default function MissionPage() {
  const router = useRouter();
  const { state, updateState } = useOnboarding();

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
      <div className="max-w-2xl mx-auto space-y-6 text-lg md:text-xl font-mono">
        <m.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-balance"
        >
          GREETINGS <span className="font-bold text-blob-mint">{state.username || "USER"}</span>.
        </m.p>

        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <Image
            src="/choice/ronin.webp"
            alt="Ronin Logo"
            width={120}
            height={120}
            className="object-contain"
          />
        </m.div>

        <m.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-2xl font-black font-mono text-blob-mint text-balance"
        >
          Will you help grow Ronin by working for The Blob?
        </m.p>
      </div>

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
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
