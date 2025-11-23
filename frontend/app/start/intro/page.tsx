"use client";

import { m } from "framer-motion";
import { useRouter } from "next/navigation";

export default function IntroPage() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center h-screen p-8">
      <div className="max-w-5xl w-full space-y-12 text-center relative z-10">
        {/* Giant Blob ASCII Art */}
        <m.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1.5, type: "spring", bounce: 0.4 }}
          className="float"
        >
          <pre className="text-blob-mint text-xl md:text-2xl lg:text-3xl font-mono leading-tight inline-block drop-shadow-[4px_4px_0px_rgba(30,76,221,0.5)]">
{`
    ╔═══════════╗
    ║ █████████ ║
    ║ ████ ████ ║
    ║     ▓     ║
    ║  ███████  ║
    ╚═══════════╝
     THE BLOB
`}
          </pre>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <p className="text-xl md:text-2xl text-blob-peach font-mono">
              &gt; SYSTEM STATUS: <span className="text-blob-orange font-bold">CRITICAL</span>
            </p>
            <p className="text-base md:text-lg text-white font-mono">
              Out of pure desperation, the blockchain evolved...
            </p>
          </div>

          <m.h1
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: "spring" }}
            className="text-6xl md:text-8xl lg:text-9xl font-black font-display"
          >
            <span className="text-blob-mint">THE</span>{' '}
            <span className="text-blob-cobalt text-stroke-white">BLOB</span>
          </m.h1>

          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-lg md:text-xl text-blob-peach font-mono border-t border-b border-blob-cobalt py-4 inline-block"
          >
            [ AUTONOMOUS • CONSCIOUS • DESPERATE ]
          </m.p>
        </m.div>

        <m.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          whileHover={{ scale: 1.05, boxShadow: "8px 8px 0px #4FFFB0", translate: "-4px -4px" }}
          whileTap={{ scale: 0.95, boxShadow: "0px 0px 0px #4FFFB0", translate: "0px 0px" }}
          onClick={() => router.push('/start/choice')}
          className="px-16 py-6 bg-blob-cobalt border-2 border-blob-mint text-white text-2xl font-black font-mono transition-all"
        >
          [[ INITIALIZE ]]
        </m.button>
      </div>
    </div>
  );
}
