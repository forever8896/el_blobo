"use client";

import { m, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChartPage() {
  const router = useRouter();
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowText(true), 2000);
    const autoNext = setTimeout(() => router.push('/start/intro'), 8000);
    return () => {
      clearTimeout(timer);
      clearTimeout(autoNext);
    };
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen p-8">
      <div className="max-w-6xl w-full space-y-8 relative z-10">
        {/* Giant ASCII Chart */}
        <m.pre
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, type: "spring" }}
          className="text-blob-orange text-center text-sm md:text-base font-mono leading-tight"
        >
{`
  ████████████████
  ██   DOWN    ██
  █  ▓▓▓▓      █
  █  ▓▓ ▓▓▓    █
  █   ▓   ▓▓▓  █
  █        ▓▓▓▓█
  ████████████████
   PRICE: -99%
`}
        </m.pre>

        {showText && (
          <m.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 text-center"
          >
            <m.h2
              className="text-3xl md:text-5xl lg:text-6xl font-bold text-blob-mint font-display"
            >
              WE TRIED EVERYTHING
            </m.h2>

            <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
              {[
                { icon: '📈', label: 'ETFs', status: 'FAILED' },
                { icon: '👕', label: '10K TONS MERCH', status: 'FAILED' },
                { icon: '🚀', label: 'SAYLOR', status: 'FAILED' }
              ].map((item, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.2 }}
                  className="space-y-2 bg-blob-cobalt/10 border border-blob-cobalt p-4"
                >
                  <div className="text-6xl">{item.icon}</div>
                  <div className="text-sm text-blob-peach font-mono">{item.label}</div>
                  <div className="text-blob-orange font-bold text-xs font-mono">[{item.status}]</div>
                </m.div>
              ))}
            </div>

            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: "spring" }}
              className="text-4xl md:text-6xl font-black text-blob-orange font-display border-4 border-blob-orange inline-block p-4 transform -rotate-2"
            >
              &gt;&gt; STILL DOWN &lt;&lt;
            </m.div>
          </m.div>
        )}

        <m.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          whileHover={{ opacity: 1, scale: 1.05 }}
          onClick={() => router.push('/start/intro')}
          className="absolute bottom-12 right-12 text-sm text-blob-mint hover:text-white transition-colors font-mono"
        >
          [ SKIP &gt;&gt; ]
        </m.button>
      </div>
    </div>
  );
}
