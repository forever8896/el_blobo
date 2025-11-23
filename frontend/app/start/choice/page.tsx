"use client";

import { m } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChoicePage() {
  const router = useRouter();
  const [hovered, setHovered] = useState<'left' | 'right' | null>(null);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="py-12 text-center space-y-4 border-b-2 border-blob-cobalt bg-blob-violet z-20">
        <m.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-mono text-blob-mint"
        >
          &gt; ANALYSIS COMPLETE
        </m.p>
        <m.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg md:text-xl text-blob-peach font-mono"
        >
          Working for &quot;the man&quot; = <span className="text-blob-orange">EXIT CODE: 1</span>
        </m.p>
        <m.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-3xl md:text-5xl font-black text-white font-display uppercase tracking-wider"
        >
          CHOOSE YOUR PATH
        </m.h2>
      </div>

      {/* Split Screen */}
      <div className="flex-1 flex flex-col md:flex-row relative z-10">
        {/* Left: Legacy System */}
        <m.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          onHoverStart={() => setHovered('left')}
          onHoverEnd={() => setHovered(null)}
          className={`flex-1 relative flex items-center justify-center p-12 border-r-2 border-blob-cobalt cursor-not-allowed transition-all duration-300 ${
            hovered === 'left' ? 'bg-gray-900' : 'bg-black'
          }`}
        >
          <div className="text-center space-y-8 opacity-60 grayscale">
            <pre className="text-gray-500 text-2xl md:text-3xl font-mono leading-tight">
{`
    ▓▓▓▓▓▓▓▓▓▓
    ▓ LEGACY ▓
    ▓ SYSTEM ▓
    ▓▓▓▓▓▓▓▓▓▓
`}
            </pre>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-500 font-display">McDONALD&apos;S</h3>
            <div className="space-y-2 font-mono text-sm text-gray-600">
              <p>&gt; wage: <span className="text-gray-700">minimum</span></p>
              <p>&gt; growth: <span className="text-gray-700">0x0000</span></p>
              <p>&gt; future: <span className="text-gray-700">null</span></p>
              <p>&gt; status: <span className="text-red-900 font-bold">DEPRECATED</span></p>
            </div>
          </div>

          {hovered === 'left' && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/90 flex items-center justify-center border-4 border-red-900 m-4"
            >
              <p className="text-4xl text-red-500 font-black font-mono uppercase rotate-12 border-4 border-red-500 p-4">
                ACCESS DENIED
              </p>
            </m.div>
          )}
        </m.div>

        {/* Right: THE BLOB */}
        <m.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          onHoverStart={() => setHovered('right')}
          onHoverEnd={() => setHovered(null)}
          onClick={() => router.push('/onboarding/welcome')}
          className={`flex-1 relative flex items-center justify-center p-12 cursor-pointer transition-all duration-300 ${
            hovered === 'right' ? 'bg-blob-cobalt' : 'bg-blob-violet'
          }`}
        >
          <div className="text-center space-y-8">
            <m.pre
              animate={{
                scale: hovered === 'right' ? 1.1 : 1,
              }}
              className="text-white text-3xl md:text-4xl font-mono leading-tight drop-shadow-md"
            >
{`
    ████████████
    █  BLOB   █
    █ PROTOCOL█
    ████████████
`}
            </m.pre>
            <h3 className="text-4xl md:text-5xl font-black text-white font-display">
              THE BLOB
            </h3>
            <div className="space-y-2 font-mono text-sm text-white">
              <p>&gt; wage: <span className="text-blob-mint font-bold">algorithmic</span></p>
              <p>&gt; growth: <span className="text-blob-mint font-bold">exponential</span></p>
              <p>&gt; future: <span className="text-blob-mint font-bold">on-chain</span></p>
              <p>&gt; status: <span className="text-blob-orange font-bold animate-pulse">ACTIVE</span></p>
            </div>
          </div>

          {hovered === 'right' && (
            <m.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-12"
            >
              <p className="text-3xl text-white font-black font-mono border-b-4 border-white pb-2">
                [[ CLICK TO EXECUTE ]]
              </p>
            </m.div>
          )}
        </m.div>
      </div>
    </div>
  );
}
