"use client";

import { m } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";

import TheBlob from "@/app/components/TheBlob";

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

      {/* Cards Container */}
      <div className="flex-1 flex flex-row items-center justify-center gap-12 relative z-10">
        {/* Left: Legacy System */}
        <m.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          onHoverStart={() => setHovered('left')}
          onHoverEnd={() => setHovered(null)}
          className={`w-[200px] h-[300px] relative rounded-xl overflow-hidden border-2 border-blob-cobalt cursor-not-allowed transition-all duration-300 bg-[url('/choice/mcdonalds.jpeg')] bg-cover bg-center ${
            hovered === 'left' ? 'bg-gray-900/50 scale-105' : ''
          }`}
        >
        </m.div>

        {/* Right: THE BLOB */}
        <m.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          onHoverStart={() => setHovered('right')}
          onHoverEnd={() => setHovered(null)}
          onClick={() => router.push('/onboarding/welcome')}
          className={`w-[200px] h-[300px] relative rounded-xl overflow-hidden border-2 border-blob-mint cursor-pointer transition-all duration-300 ${
            hovered === 'right' ? 'bg-blob-cobalt scale-105' : 'bg-blob-violet'
          }`}
        >
            <div className="relative w-full h-full">
                <TheBlob autoEmerge={true} />
            </div>
        </m.div>
      </div>
    </div>
  );
}
