"use client";

import { m, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface LandingPageProps {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  const [step, setStep] = useState<'chart' | 'intro' | 'choice'>('chart');

  return (
    <div className="fixed inset-0 bg-blob-violet overflow-hidden">
      {/* Geometric background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-blob-cobalt opacity-50" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-blob-cobalt opacity-50" />
        <div className="absolute top-[10%] left-[10%] w-4 h-4 bg-blob-mint rounded-none" />
        <div className="absolute top-[20%] right-[20%] w-4 h-4 bg-blob-orange rounded-full" />
        <div className="absolute bottom-[15%] left-[30%] w-8 h-8 border-2 border-blob-cobalt rotate-45" />
      </div>
      
      <div className="scanline" />
      
      <AnimatePresence mode="wait">
        {step === 'chart' && <ChartScene key="chart" onNext={() => setStep('intro')} />}
        {step === 'intro' && <IntroScene key="intro" onNext={() => setStep('choice')} />}
        {step === 'choice' && <ChoiceScene key="choice" onWorkForBlob={onEnter} />}
      </AnimatePresence>
    </div>
  );
}

function ChartScene({ onNext }: { onNext: () => void }) {
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowText(true), 2000);
    const autoNext = setTimeout(() => onNext(), 8000);
    return () => {
      clearTimeout(timer);
      clearTimeout(autoNext);
    };
  }, [onNext]);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center h-screen p-8"
    >
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
          onClick={onNext}
          className="absolute bottom-12 right-12 text-sm text-blob-mint hover:text-white transition-colors font-mono"
        >
          [ SKIP &gt;&gt; ]
        </m.button>
      </div>
    </m.div>
  );
}

function IntroScene({ onNext }: { onNext: () => void }) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center h-screen p-8"
    >
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
          onClick={onNext}
          className="px-16 py-6 bg-blob-cobalt border-2 border-blob-mint text-white text-2xl font-black font-mono transition-all"
        >
          [[ INITIALIZE ]]
        </m.button>
      </div>
    </m.div>
  );
}

function ChoiceScene({ onWorkForBlob }: { onWorkForBlob: () => void }) {
  const [hovered, setHovered] = useState<'left' | 'right' | null>(null);

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen flex flex-col"
    >
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
          onClick={onWorkForBlob}
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
    </m.div>
  );
}
