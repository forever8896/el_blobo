"use client";

import { useState, useEffect, useRef } from "react";
import { useAgent } from "./hooks/useAgent";
import ReactMarkdown from "react-markdown";
import LandingPage from "./components/LandingPage";
import OnboardingFlow, { OnboardingData } from "./components/OnboardingFlow";
import WorkSubmission from "./components/WorkSubmission";
import AICouncil from "./components/AICouncil";
import { useAccount, useDisconnect } from "wagmi";
import { TantoConnectButton } from "@sky-mavis/tanto-widget";

interface ActiveJob {
  id: string;
  title: string;
  description: string;
  price_estimate: number;
  deadline_start: Date;
  deadline_end: Date;
  status: 'active' | 'submitted' | 'evaluating' | 'completed';
}

export default function Home() {
  const [appState, setAppState] = useState<'landing' | 'onboarding' | 'chat'>('landing');
  const [userData, setUserData] = useState<OnboardingData | null>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // Wagmi hooks for wallet connection in header
  const { address: connectedWallet, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Pass wallet address to useAgent hook
  const { messages, sendMessage, isThinking } = useAgent(userData?.walletAddress);

  // Job workflow state
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [showWorkSubmission, setShowWorkSubmission] = useState(false);
  const [showAICouncil, setShowAICouncil] = useState(false);
  const [submissionData, setSubmissionData] = useState<{ url: string; notes: string } | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedWallet = localStorage.getItem('userWallet');
        const savedUsername = localStorage.getItem('username');

        if (savedWallet && savedUsername) {
          // Fetch user profile from database
          const response = await fetch(`/api/users/profile?walletAddress=${savedWallet}`);

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
              // Restore user data
              setUserData({
                username: data.user.username,
                walletAddress: data.user.wallet_address,
                agreedToMission: true,
                depositCompleted: true,
                interviewResponses: data.user.skills?.responses || []
              });
              setAppState('chat');
            }
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreSession();
  }, []);

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
    try {
      // Register user in database
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: data.walletAddress,
          username: data.username,
          interviewResponses: data.interviewResponses,
          referrerAddress: data.referrerAddress
        })
      });

      const result = await response.json();

      if (result.success) {
        // Save to localStorage for session persistence
        localStorage.setItem('userWallet', data.walletAddress);
        localStorage.setItem('username', data.username);
        localStorage.setItem('onboardingComplete', 'true');

        setUserData(data);
        await sendMessage(
          `PROTOCOL INIT: User ${data.username} joined THE BLOB. Deposit confirmed. Interview complete. Ready for job assignment.`
        );
        setAppState('chat');
      } else {
        // Handle registration error
        console.error('Registration failed:', result.message);
        alert(`Registration failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error during registration:', error);
      alert('Failed to complete registration. Please try again.');
    }
  };

  // Simulate job assignment (this would normally come from THE BLOB's response)
  const assignJob = (jobData: Partial<ActiveJob>) => {
    const newJob: ActiveJob = {
      id: jobData.id || `job-${Date.now()}`,
      title: jobData.title || "New Job",
      description: jobData.description || "Job description",
      price_estimate: jobData.price_estimate || 100,
      deadline_start: new Date(),
      deadline_end: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
      status: 'active'
    };
    setActiveJob(newJob);
  };

  const handleWorkSubmit = (submissionUrl: string, submissionNotes: string) => {
    if (!activeJob) return;

    setSubmissionData({ url: submissionUrl, notes: submissionNotes });
    setShowWorkSubmission(false);
    setShowAICouncil(true);

    // Update job status
    setActiveJob(prev => prev ? { ...prev, status: 'evaluating' } : null);
  };

  const handleCouncilComplete = async (approved: boolean) => {
    setShowAICouncil(false);

    if (approved && activeJob) {
      // Update job status
      setActiveJob(prev => prev ? { ...prev, status: 'completed' } : null);

      // Notify user via THE BLOB
      await sendMessage(
        `COUNCIL EVALUATION COMPLETE: Your work "${activeJob.title}" has been APPROVED! Payment of $${activeJob.price_estimate} is being processed. Well done.`
      );
    } else if (activeJob) {
      // Work rejected
      await sendMessage(
        `COUNCIL EVALUATION COMPLETE: Your work "${activeJob.title}" has been REJECTED. The AI judges found it below standards. Review their feedback and improve.`
      );
      // Reset job to active so they can resubmit
      setActiveJob(prev => prev ? { ...prev, status: 'active' } : null);
    }
  };

  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-blob-violet flex items-center justify-center">
        <div className="text-white text-xl font-mono animate-pulse">
          RESTORING_SESSION...
        </div>
      </div>
    );
  }

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
    <div className="fixed inset-0 bg-blob-violet flex flex-col overflow-hidden">
      <div className="scanline" />

      {/* Terminal Header */}
      <div className="border-b-2 border-blob-cobalt bg-blob-violet z-10 px-8 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <pre className="text-blob-mint text-2xl font-mono font-bold drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
{`█▓▒░ BLOB ░▒▓█`}
            </pre>
            {userData && (
              <div className="font-mono">
                <p className="text-xs text-blob-peach">&gt; OPERATOR:</p>
                <p className="text-lg text-white font-bold">{userData.username}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Wallet Connect Button */}
            <div className="wallet-connect-header">
              {isConnected && connectedWallet ? (
                <div className="flex items-center gap-3">
                  <div className="text-right font-mono text-xs">
                    <p className="text-blob-peach">LINKED_WALLET</p>
                    <p className="text-blob-mint">
                      {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                    </p>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="px-4 py-2 bg-transparent border-2 border-blob-orange text-blob-orange text-xs font-mono hover:bg-blob-orange hover:text-black transition-all font-bold"
                  >
                    [DISCONNECT]
                  </button>
                </div>
              ) : (
                <TantoConnectButton />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-20 left-10 w-64 h-64 border border-blob-cobalt rounded-full" />
          <div className="absolute bottom-20 right-10 w-96 h-96 border border-blob-mint rounded-none rotate-12" />
        </div>

        <div className="w-full max-w-7xl h-[calc(100vh-200px)] flex flex-col bg-black/40 border-2 border-blob-cobalt shadow-[8px_8px_0px_#1E4CDD] z-10">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-8">
                <pre className="text-blob-mint text-4xl float">
{`
    ╔═════════╗
    ║  BLOB   ║
    ║ ONLINE  ║
    ╚═════════╝
`}
                </pre>
                <p className="text-xl text-blob-peach">
                  &gt; SYSTEM READY. AWAITING INPUT...
                </p>
                <div className="space-y-2 text-sm text-gray-500 text-center">
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
                  {msg.sender === "agent" && (
                    <div className="flex items-center gap-2 mb-2 text-blob-mint">
                      <span className="text-lg">█▓▒░</span>
                      <span className="text-xs font-bold">THE BLOB</span>
                    </div>
                  )}
                  <div
                    className={`p-4 border-2 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] ${
                      msg.sender === "user"
                        ? "bg-blob-cobalt border-blob-mint text-white text-right"
                        : "bg-blob-violet border-blob-cobalt text-gray-100"
                    }`}
                  >
                    <ReactMarkdown
                      components={{
                        a: props => (
                          <a
                            {...props}
                            className="text-blob-orange underline hover:text-white"
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
              <div className="flex items-center gap-3 text-blob-mint p-4">
                <span className="text-xl animate-pulse">█▓▒░</span>
                <span className="text-sm">THE BLOB PROCESSING<span className="cursor-blink">_</span></span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t-2 border-blob-cobalt bg-blob-violet p-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-xs text-blob-peach font-mono mb-2 block">
                  &gt; COMMAND INPUT:
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-black border-2 border-blob-cobalt text-white font-mono focus:outline-none focus:border-blob-mint focus:shadow-[4px_4px_0px_#4FFFB0] transition-all"
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
                    ? "bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed"
                    : "bg-blob-cobalt border-2 border-blob-mint text-white hover:shadow-[4px_4px_0px_#4FFFB0] hover:-translate-y-1"
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
      <div className="border-t-2 border-blob-cobalt bg-blob-violet px-8 py-4">
        <div className="flex gap-4 justify-center flex-wrap max-w-5xl mx-auto items-center">
          {[
            { label: "REQUEST JOB", cmd: "Assign me a job based on my skills" },
            { label: "PROGRESS", cmd: "Show my stats and earnings" },
            { label: "INVITE", cmd: "How do I invite someone?" }
          ].map((action, i) => (
            <button
              key={i}
              onClick={() => sendMessage(action.cmd)}
              disabled={isThinking}
              className="px-6 py-2 bg-transparent border-2 border-blob-cobalt text-blob-mint text-xs font-mono hover:bg-blob-cobalt hover:text-white transition-all disabled:opacity-30 hover:shadow-[3px_3px_0px_#4FFFB0]"
            >
              [{action.label}]
            </button>
          ))}

          {/* Demo Job Assignment Button */}
          <button
            onClick={() => assignJob({
              title: "Create engaging meme for Base blockchain",
              description: "Twitter sentiment shows memecoin fatigue. Create a FRESH, creative meme that doesn't suck. Must be original, funny, and actually help the ecosystem.",
              price_estimate: 150
            })}
            className="px-6 py-2 bg-blob-orange border-2 border-white text-black text-xs font-mono hover:scale-105 transition-all font-bold shadow-[3px_3px_0px_#FFFFFF]"
          >
            [DEMO: GET JOB]
          </button>

          {/* Submit Work Button - Only show if there's an active job */}
          {activeJob && activeJob.status === 'active' && (
            <button
              onClick={() => setShowWorkSubmission(true)}
              className="px-6 py-2 bg-blob-green border-2 border-white text-black text-xs font-mono hover:scale-105 transition-all animate-pulse font-bold"
            >
              [SUBMIT WORK: {activeJob.title.substring(0, 20)}...]
            </button>
          )}

          {/* Job in Evaluation */}
          {activeJob && activeJob.status === 'evaluating' && (
            <div className="px-6 py-2 bg-blob-orange/20 border border-blob-orange text-blob-orange text-xs font-mono">
              [AI COUNCIL EVALUATING...]
            </div>
          )}

          {/* Job Completed */}
          {activeJob && activeJob.status === 'completed' && (
            <div className="px-6 py-2 bg-blob-green/20 border border-blob-green text-blob-green text-xs font-mono">
              [JOB COMPLETED ✓]
            </div>
          )}
        </div>
      </div>

      {/* Work Submission Modal */}
      {showWorkSubmission && activeJob && (
        <WorkSubmission
          project={{
            id: activeJob.id,
            title: activeJob.title,
            description: activeJob.description,
            price_estimate: activeJob.price_estimate,
            deadline_end: activeJob.deadline_end
          }}
          onSubmit={handleWorkSubmit}
          onCancel={() => setShowWorkSubmission(false)}
        />
      )}

      {/* AI Council Evaluation Modal */}
      {showAICouncil && activeJob && submissionData && (
        <AICouncil
          projectId={activeJob.id}
          submissionUrl={submissionData.url}
          submissionNotes={submissionData.notes}
          onComplete={handleCouncilComplete}
        />
      )}
    </div>
  );
}
