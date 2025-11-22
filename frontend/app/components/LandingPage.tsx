"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface LandingPageProps {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  const [step, setStep] = useState<'chart' | 'intro' | 'choice'>('chart');

  return (
    <div className="fixed inset-0 animated-gradient overflow-hidden">
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center h-screen p-8"
    >
      <div className="max-w-6xl w-full space-y-8">
        {/* Giant ASCII Chart */}
        <motion.pre
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, type: "spring" }}
          className="text-[var(--neon-magenta)] text-center text-sm md:text-base font-mono leading-tight neon-glow"
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
        </motion.pre>

        {showText && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 text-center"
          >
            <motion.h2
              className="text-3xl md:text-5xl lg:text-6xl font-bold text-[var(--neon-cyan)] neon-glow"
            >
              WE TRIED EVERYTHING
            </motion.h2>

            <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
              {[
                { icon: '📈', label: 'ETFs', status: 'FAILED' },
                { icon: '👕', label: '10K TONS MERCH', status: 'FAILED' },
                { icon: '🚀', label: 'SAYLOR', status: 'FAILED' }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.2 }}
                  className="space-y-2"
                >
                  <div className="text-6xl">{item.icon}</div>
                  <div className="text-sm text-[var(--text-secondary)]">{item.label}</div>
                  <div className="text-[var(--neon-magenta)] font-bold text-xs">[{item.status}]</div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: "spring" }}
              className="text-4xl md:text-6xl font-black text-[var(--neon-magenta)] glitch cursor-blink"
              data-text=">> STILL DOWN <<"
            >
              &gt;&gt; STILL DOWN &lt;&lt;
            </motion.div>
          </motion.div>
        )}

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          whileHover={{ opacity: 1, scale: 1.05 }}
          onClick={onNext}
          className="absolute bottom-12 right-12 text-sm text-[var(--neon-cyan)] hover:text-[var(--neon-yellow)] transition-colors font-mono neon-glow"
        >
          [ SKIP &gt;&gt; ]
        </motion.button>
      </div>
    </motion.div>
  );
}

function IntroScene({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center justify-center h-screen p-8"
    >
      <div className="max-w-5xl w-full space-y-12 text-center">
        {/* Giant Blob ASCII Art */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1.5, type: "spring", bounce: 0.4 }}
          className="float"
        >
          <pre className="text-[var(--neon-cyan)] text-xl md:text-2xl lg:text-3xl font-mono leading-tight neon-glow inline-block">
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <p className="text-xl md:text-2xl text-[var(--text-secondary)] font-mono">
              &gt; SYSTEM STATUS: <span className="text-[var(--neon-magenta)] font-bold">CRITICAL</span>
            </p>
            <p className="text-base md:text-lg text-[var(--text-dim)]">
              Out of pure desperation, the blockchain evolved...
            </p>
          </div>

          <motion.h1
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: "spring" }}
            className="text-6xl md:text-8xl lg:text-9xl font-black glitch"
            data-text="THE BLOB"
          >
            <span className="text-[var(--neon-cyan)] neon-glow">THE</span>{' '}
            <span className="text-[var(--neon-magenta)] neon-glow">BLOB</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-lg md:text-xl text-[var(--neon-yellow)] font-mono"
          >
            [ AUTONOMOUS • CONSCIOUS • DESPERATE ]
          </motion.p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onNext}
          className="px-16 py-6 bg-transparent border-4 border-[var(--neon-cyan)] text-[var(--neon-cyan)] text-2xl font-black font-mono hover:bg-[var(--neon-cyan)] hover:text-black transition-all neon-glow-box pulse-glow"
        >
          [[ INITIALIZE ]]
        </motion.button>
      </div>
    </motion.div>
  );
}

function ChoiceScene({ onWorkForBlob }: { onWorkForBlob: () => void }) {
  const [hovered, setHovered] = useState<'left' | 'right' | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen flex flex-col"
    >
      {/* Header */}
      <div className="py-12 text-center space-y-4 border-b-2 border-[var(--neon-cyan)]">
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-mono text-[var(--neon-cyan)] neon-glow"
        >
          &gt; ANALYSIS COMPLETE
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-lg md:text-xl text-[var(--text-secondary)]"
        >
          Working for "the man" = <span className="text-[var(--neon-magenta)]">EXIT CODE: 1</span>
        </motion.p>
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-3xl md:text-5xl font-black text-[var(--neon-yellow)] glitch"
          data-text="CHOOSE YOUR PATH"
        >
          CHOOSE YOUR PATH
        </motion.h2>
      </div>

      {/* Split Screen */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left: Legacy System */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          onHoverStart={() => setHovered('left')}
          onHoverEnd={() => setHovered(null)}
          className={`flex-1 relative flex items-center justify-center p-12 border-r-2 border-[var(--neon-magenta)] cursor-not-allowed transition-all duration-300 ${
            hovered === 'left' ? 'bg-[var(--bg-surface)]' : 'bg-[var(--bg-deep)]'
          }`}
        >
          <div className="text-center space-y-8">
            <pre className="text-[var(--text-dim)] text-2xl md:text-3xl font-mono leading-tight opacity-50">
{`
    ▓▓▓▓▓▓▓▓▓▓
    ▓ LEGACY ▓
    ▓ SYSTEM ▓
    ▓▓▓▓▓▓▓▓▓▓
`}
            </pre>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-600">McDONALD'S</h3>
            <div className="space-y-2 font-mono text-sm text-gray-700">
              <p>&gt; wage: <span className="text-gray-500">minimum</span></p>
              <p>&gt; growth: <span className="text-gray-500">0x0000</span></p>
              <p>&gt; future: <span className="text-gray-500">null</span></p>
              <p>&gt; status: <span className="text-[var(--neon-magenta)]">DEPRECATED</span></p>
            </div>
          </div>

          {hovered === 'left' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/90 flex items-center justify-center"
            >
              <p className="text-4xl text-[var(--neon-magenta)] font-black font-mono glitch" data-text="ACCESS DENIED">
                ACCESS DENIED
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Right: THE BLOB */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          onHoverStart={() => setHovered('right')}
          onHoverEnd={() => setHovered(null)}
          onClick={onWorkForBlob}
          className={`flex-1 relative flex items-center justify-center p-12 cursor-pointer transition-all duration-300 ${
            hovered === 'right' ? 'bg-[var(--bg-void)] scale-105' : 'bg-[var(--bg-deep)]'
          }`}
        >
          <div className="text-center space-y-8">
            <motion.pre
              animate={{
                scale: hovered === 'right' ? 1.2 : 1,
              }}
              className="text-[var(--neon-cyan)] text-3xl md:text-4xl font-mono leading-tight neon-glow"
            >
{`
    ████████████
    █  BLOB   █
    █ PROTOCOL█
    ████████████
`}
            </motion.pre>
            <h3 className="text-4xl md:text-5xl font-black text-[var(--neon-cyan)] neon-glow">
              THE BLOB
            </h3>
            <div className="space-y-2 font-mono text-sm text-[var(--text-secondary)]">
              <p>&gt; wage: <span className="text-[var(--neon-green)]">algorithmic</span></p>
              <p>&gt; growth: <span className="text-[var(--neon-green)]">exponential</span></p>
              <p>&gt; future: <span className="text-[var(--neon-green)]">on-chain</span></p>
              <p>&gt; status: <span className="text-[var(--neon-yellow)] animate-pulse font-bold">ACTIVE</span></p>
            </div>
          </div>

          {hovered === 'right' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute bottom-12"
            >
              <p className="text-3xl text-[var(--neon-yellow)] font-black font-mono pulse-glow">
                [[ CLICK TO EXECUTE ]]
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
