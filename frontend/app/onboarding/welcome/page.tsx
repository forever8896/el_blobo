"use client";

import { m } from "framer-motion";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();
  // In a real scenario, we might check URL params for referrerName
  const referrerName = undefined; 

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
        onClick={() => router.push('/onboarding/identity')}
        className="px-12 py-4 bg-blob-cobalt border-2 border-blob-mint text-white text-xl font-bold font-mono transition-all"
      >
        INITIALIZE_PROTOCOL
      </m.button>
    </m.div>
  );
}
