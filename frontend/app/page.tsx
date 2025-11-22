"use client";

import { useState, useEffect, useRef } from "react";
import { useAgent } from "./hooks/useAgent";
import ReactMarkdown from "react-markdown";
import LandingPage from "./components/LandingPage";
import OnboardingFlow, { OnboardingData } from "./components/OnboardingFlow";

export default function Home() {
  const [appState, setAppState] = useState<'landing' | 'onboarding' | 'chat'>('landing');
  const [userData, setUserData] = useState<OnboardingData | null>(null);
  const [input, setInput] = useState("");
  const { messages, sendMessage, isThinking } = useAgent();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    setUserData(data);
    await sendMessage(
      `PROTOCOL INIT: User ${data.username} joined THE BLOB. Deposit confirmed. Interview complete. Ready for job assignment.`
    );
    setAppState('chat');
  };

  if (appState === 'landing') {
    return <LandingPage onEnter={() => setAppState('onboarding')} />;
  }

  if (appState === 'onboarding') {
    return (
      <OnboardingFlow
        referrerName={undefined}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // Main chat interface
  return (
    <div className="fixed inset-0 animated-gradient flex flex-col overflow-hidden">
      <div className="scanline" />

      {/* Terminal Header */}
      {userData && (
        <div className="border-b-2 border-[var(--neon-cyan)] bg-black/40 backdrop-blur-sm px-8 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-6">
              <pre className="text-[var(--neon-cyan)] text-2xl font-mono neon-glow">
{`█▓▒░ BLOB ░▒▓█`}
              </pre>
              <div className="font-mono">
                <p className="text-xs text-[var(--text-dim)]">&gt; USER:</p>
                <p className="text-lg text-[var(--neon-yellow)] font-bold">{userData.username}</p>
              </div>
            </div>
            <div className="text-right font-mono text-xs">
              <p className="text-[var(--text-dim)]">WALLET</p>
              <p className="text-[var(--neon-cyan)]">
                {userData.walletAddress.slice(0, 6)}...{userData.walletAddress.slice(-4)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="w-full max-w-7xl h-[calc(100vh-200px)] flex flex-col bg-black/60 backdrop-blur-sm border-2 border-[var(--neon-cyan)] neon-glow-box">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-8">
                <pre className="text-[var(--neon-cyan)] text-4xl neon-glow float">
{`
    ╔═════════╗
    ║  BLOB   ║
    ║ ONLINE  ║
    ╚═════════╝
`}
                </pre>
                <p className="text-xl text-[var(--text-secondary)]">
                  &gt; SYSTEM READY. AWAITING INPUT...
                </p>
                <div className="space-y-2 text-sm text-[var(--text-dim)] text-center">
                  <p>[ Ask about jobs | Check progress | Invite others ]</p>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`${
                    msg.sender === "user"
                      ? "ml-12"
                      : "mr-12"
                  }`}
                >
                  {msg.sender === "assistant" && (
                    <div className="flex items-center gap-2 mb-2 text-[var(--neon-cyan)]">
                      <span className="text-lg">█▓▒░</span>
                      <span className="text-xs font-bold">THE BLOB</span>
                    </div>
                  )}
                  <div
                    className={`p-4 rounded-none border-2 ${
                      msg.sender === "user"
                        ? "bg-[var(--neon-magenta)]/20 border-[var(--neon-magenta)] text-right"
                        : "bg-[var(--neon-cyan)]/10 border-[var(--neon-cyan)]"
                    }`}
                  >
                    <ReactMarkdown
                      components={{
                        a: props => (
                          <a
                            {...props}
                            className="text-[var(--neon-yellow)] underline hover:text-[var(--neon-cyan)]"
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
              ))
            )}

            {isThinking && (
              <div className="flex items-center gap-3 text-[var(--neon-cyan)] p-4">
                <span className="text-xl animate-pulse">█▓▒░</span>
                <span className="text-sm">THE BLOB PROCESSING<span className="cursor-blink">_</span></span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t-2 border-[var(--neon-cyan)] bg-black/80 p-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-xs text-[var(--text-dim)] font-mono mb-2 block">
                  &gt; INPUT:
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-black/60 border-2 border-[var(--neon-magenta)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--neon-cyan)] transition-colors"
                  placeholder="Enter command..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && onSendMessage()}
                  disabled={isThinking}
                />
              </div>
              <button
                onClick={onSendMessage}
                className={`px-8 py-3 font-black font-mono text-lg transition-all ${
                  isThinking
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-transparent border-2 border-[var(--neon-cyan)] text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)] hover:text-black neon-glow-box"
                }`}
                disabled={isThinking}
              >
                [SEND]
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="border-t-2 border-[var(--neon-cyan)] bg-black/40 backdrop-blur-sm px-8 py-4">
        <div className="flex gap-4 justify-center flex-wrap max-w-5xl mx-auto">
          {[
            { label: "JOBS", cmd: "What jobs are available?" },
            { label: "PROGRESS", cmd: "Show my stats and earnings" },
            { label: "INVITE", cmd: "How do I invite someone?" }
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => sendMessage(action.cmd)}
              disabled={isThinking}
              className="px-6 py-2 bg-transparent border border-[var(--neon-cyan)] text-[var(--neon-cyan)] text-xs font-mono hover:bg-[var(--neon-cyan)] hover:text-black transition-all disabled:opacity-30"
            >
              [{action.label}]
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
