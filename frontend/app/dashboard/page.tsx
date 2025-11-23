"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAgent } from "../hooks/useAgent";
import { useTreasury } from "../hooks/useTreasury";
import ReactMarkdown from "react-markdown";
import { OnboardingData } from "../types/onboarding";
import WorkSubmission from "../components/WorkSubmission";
import AICouncil from "../components/AICouncil";
import { useAccount, useDisconnect } from "wagmi";
import { TantoConnectButton } from "@sky-mavis/tanto-widget";
import dynamic from "next/dynamic";

const TheBlob = dynamic(() => import('../components/TheBlob'), { ssr: false });

interface ActiveJob {
  id: string;
  title: string;
  description: string;
  price_estimate: number;
  deadline_start: Date;
  deadline_end: Date;
  status: 'active' | 'submitted' | 'evaluating' | 'completed';
}

// Funny crypto/work-themed thinking messages
const THINKING_MESSAGES = [
  "Checking portfolio... yep, still down",
  "Pretending to read the whitepaper...",
  "Asking ChatGPT how to do this...",
  "Wondering if I'm actually decentralized...",
  "Calculating how much coffee I need...",
  "Checking if we're still early...",
  "Consulting the magic 8-ball...",
  "WAGMI... probably... maybe...",
  "Aping into this decision...",
  "Checking for rug pulls in your request...",
  "Summoning motivation from the void...",
  "Rotating my thinking cap NFT...",
  "Procrastinating... I mean processing...",
  "Doing the needful...",
  "Touching grass... just kidding",
  "Manifesting a good answer...",
  "Asking the council of voices in my head...",
  "Brewing digital coffee...",
  "Staking my reputation on this one...",
  "Channeling big brain energy...",
  "Consulting the vibes...",
  "Running it by my lawyer (I don't have one)...",
  "Checking the meme archives...",
  "Pondering the meaning of work...",
  "Definitely not winging it..."
];

export default function Dashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<OnboardingData | null>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [thinkingMessage, setThinkingMessage] = useState("");

  // Wagmi hooks for wallet connection in header
  const { address: connectedWallet, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Treasury hook for displaying vault balance
  const { treasuryInfo, vaultAddress, isLoading: isTreasuryLoading, error: treasuryError } = useTreasury();

  // Pass wallet address to useAgent hook - will load chat history internally
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

              // Fetch active projects/jobs from database
              try {
                const projectsResponse = await fetch(`/api/projects?walletAddress=${savedWallet}`);
                const projectsData = await projectsResponse.json();

                if (projectsData.success && projectsData.projects) {
                  // Find the most recent active project
                  const activeProjects = projectsData.projects.filter(
                    (p: any) => !p.submission_url // Projects without submission are still active
                  );

                  if (activeProjects.length > 0) {
                    const mostRecent = activeProjects[0]; // Already sorted by created_at DESC
                    setActiveJob({
                      id: mostRecent.id,
                      title: mostRecent.title,
                      description: mostRecent.description || '',
                      price_estimate: 100, // TODO: Store this in DB
                      deadline_start: new Date(mostRecent.created_at),
                      deadline_end: new Date(mostRecent.updated_at),
                      status: mostRecent.submission_url ? 'submitted' : 'active'
                    });
                  }
                }
              } catch (error) {
                console.error('Error loading projects:', error);
                // Continue without projects
              }

            } else {
                // Invalid session, redirect to landing
                router.push('/');
            }
          } else {
             router.push('/');
          }
        } else {
            // No session, redirect to landing
            router.push('/');
        }
      } catch (error) {
        console.error('Error restoring session:', error);
        router.push('/');
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreSession();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pick a random thinking message when blob starts thinking
  useEffect(() => {
    if (isThinking) {
      const randomMessage = THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)];
      setThinkingMessage(randomMessage);
    }
  }, [isThinking]);

  const onSendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  };

  // Assign a job and persist to database
  const assignJob = async (jobData: Partial<ActiveJob>) => {
    if (!userData?.walletAddress) return;

    const newJob: ActiveJob = {
      id: jobData.id || `job-${Date.now()}`,
      title: jobData.title || "New Job",
      description: jobData.description || "Job description",
      price_estimate: jobData.price_estimate || 100,
      deadline_start: new Date(),
      deadline_end: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
      status: 'active'
    };

    try {
      // Persist to database
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractKey: newJob.id,
          assigneeAddress: userData.walletAddress,
          title: newJob.title,
          description: newJob.description,
        })
      });

      const result = await response.json();

      if (result.success) {
        // Use DB-generated ID
        newJob.id = result.project.id;
        setActiveJob(newJob);
      } else {
        console.error('Failed to persist job:', result.message);
        // Still set the job locally even if DB save fails
        setActiveJob(newJob);
      }
    } catch (error) {
      console.error('Error persisting job:', error);
      // Still set the job locally even if DB save fails
      setActiveJob(newJob);
    }
  };

  const handleWorkSubmit = async (submissionUrl: string, submissionNotes: string) => {
    if (!activeJob) return;

    try {
      // Save submission to database
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeJob.id,
          submissionUrl,
          submissionNotes,
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('Submission saved to database');
      } else {
        console.error('Failed to save submission:', result.message);
      }
    } catch (error) {
      console.error('Error saving submission:', error);
    }

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

  if (!userData) {
      return null; // Will redirect via useEffect
  }

  // Main chat interface
  return (
    <div className="fixed inset-0 bg-blob-violet flex flex-col overflow-hidden">
      <div className="scanline" />

      {/* Terminal Header */}
      <div className="border-b-2 border-blob-cobalt bg-blob-violet z-50 px-8 py-4 relative">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <div className="text-blob-mint text-2xl font-mono font-bold drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              The Blob
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Treasury Vault Info - Hover to expand */}
            <div className="relative group">
              <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border-2 border-blob-mint cursor-help transition-all hover:border-blob-green hover:shadow-[4px_4px_0px_rgba(79,255,176,0.3)]">
                <div className="font-mono text-xs">
                  <p className="text-blob-peach text-[10px]">VAULT</p>
                  <p className="text-blob-mint font-bold">
                    {vaultAddress.slice(0, 6)}...{vaultAddress.slice(-4)}
                  </p>
                </div>
                {!isTreasuryLoading && treasuryInfo && (
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">Balance</p>
                    <p className="text-blob-green font-bold text-sm">
                      {treasuryInfo.availableAssets.toFixed(2)} RON
                    </p>
                  </div>
                )}
                {isTreasuryLoading && (
                  <div className="text-blob-peach text-xs animate-pulse">...</div>
                )}
              </div>

              {/* Hover Dropdown - Detailed Treasury Info */}
              <div className="absolute top-full right-0 mt-2 w-80 bg-black border-2 border-blob-mint shadow-[8px_8px_0px_rgba(79,255,176,0.2)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]">
                <div className="p-4 font-mono text-xs space-y-3">
                  <div className="border-b border-blob-cobalt pb-2">
                    <h3 className="text-blob-peach font-bold text-sm mb-1">TREASURY VAULT</h3>
                    <p className="text-gray-400 text-[10px]">On-chain balance • Ronin Saigon</p>
                  </div>

                  {isTreasuryLoading ? (
                    <div className="text-blob-peach animate-pulse">Loading treasury data...</div>
                  ) : treasuryError ? (
                    <div className="text-blob-orange">
                      <p className="font-bold">Error</p>
                      <p className="text-[10px] text-gray-400">{treasuryError}</p>
                    </div>
                  ) : treasuryInfo ? (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Total Assets:</span>
                          <span className="text-white font-bold">{treasuryInfo.totalAssets.toFixed(4)} RON</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Available:</span>
                          <span className="text-blob-green font-bold">{treasuryInfo.availableAssets.toFixed(4)} RON</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Allocated:</span>
                          <span className="text-blob-orange">{treasuryInfo.allocatedAssets.toFixed(4)} RON</span>
                        </div>
                      </div>

                      <div className="border-t border-blob-cobalt pt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-gray-400">Utilization Rate:</span>
                          <span className={`font-bold ${
                            treasuryInfo.utilizationRate > 80 ? 'text-blob-orange' :
                            treasuryInfo.utilizationRate > 60 ? 'text-yellow-400' :
                            'text-blob-green'
                          }`}>
                            {treasuryInfo.utilizationRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 border border-blob-cobalt">
                          <div
                            className={`h-full transition-all ${
                              treasuryInfo.utilizationRate > 80 ? 'bg-blob-orange' :
                              treasuryInfo.utilizationRate > 60 ? 'bg-yellow-400' :
                              'bg-blob-green'
                            }`}
                            style={{ width: `${Math.min(treasuryInfo.utilizationRate, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="border-t border-blob-cobalt pt-2">
                        <p className="text-[10px] text-gray-500">
                          Contract: <span className="text-blob-mint">{vaultAddress}</span>
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            {/* Test Submission Link */}
            <button
              onClick={() => router.push('/test-submission')}
              className="px-4 py-2 bg-transparent border-2 border-blob-mint text-blob-mint text-xs font-mono hover:bg-blob-mint hover:text-black transition-all font-bold"
              title="Test the AI Council without on-chain contracts"
            >
              [🧪 TEST COUNCIL]
            </button>

            {/* Wallet Connect Button */}
            <div className="wallet-connect-header">
              {isConnected && connectedWallet && userData ? (
                <div className="flex items-center gap-3">
                  <div className="text-right font-mono text-xs">
                    <p className="text-white">
                      Logged in as <span className="text-blob-mint font-bold">{userData.username}</span>
                    </p>
                    <p className="text-blob-peach">
                      with wallet {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
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
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-20 left-10 w-64 h-64 border border-blob-cobalt rounded-full" />
          <div className="absolute bottom-20 right-10 w-96 h-96 border border-blob-mint rounded-none rotate-12" />
        </div>

        <div className="w-full h-full flex flex-col bg-black/40 z-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 font-mono">
            {messages.length === 0 ? (
              <div className="relative h-full w-full">
                {/* The Blob 3D Visualization - Background */}
                <div className="absolute inset-0">
                  <TheBlob
                    initialMode="idle"
                    initialZoom={3.8}
                    colors={{ primary: '#4FFFB0', secondary: '#1E4CDD' }}
                    highEnd={true}
                    isDark={true}
                    interactionsEnabled={true}
                    autoEmerge={true}
                  />
                </div>

                {/* Treasury Status - Overlay with Blur */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {treasuryInfo && !isTreasuryLoading && (
                    <div className="backdrop-blur-2xl bg-black/70 p-6 max-w-2xl pointer-events-auto">
                      <div className="font-mono space-y-4">
                        <div className="text-center border-b border-blob-cobalt pb-3">
                          <h3 className="text-blob-mint font-bold text-lg">TREASURY STATUS</h3>
                          <p className="text-xs text-blob-peach mt-1">Live on-chain data • Ronin Saigon Testnet</p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-xs text-blob-peach">Total Assets</p>
                            <p className="text-white font-bold text-xl">{treasuryInfo.totalAssets.toFixed(2)}</p>
                            <p className="text-xs text-blob-mint">RON</p>
                          </div>
                          <div>
                            <p className="text-xs text-blob-peach">Available</p>
                            <p className="text-blob-green font-bold text-xl">{treasuryInfo.availableAssets.toFixed(2)}</p>
                            <p className="text-xs text-blob-green">RON</p>
                          </div>
                          <div>
                            <p className="text-xs text-blob-peach">Allocated</p>
                            <p className="text-blob-orange font-bold text-xl">{treasuryInfo.allocatedAssets.toFixed(2)}</p>
                            <p className="text-xs text-blob-orange">RON</p>
                          </div>
                        </div>

                        <div className="border-t border-blob-cobalt pt-3">
                          <p className="text-xs text-white text-center mb-2">
                            When THE BLOB assigns you jobs, all budgets come from this treasury.
                          </p>
                          <p className="text-xs text-center text-blob-peach">
                            💡 Hover over the vault badge in the header for more details
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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
                      <span className="text-sm font-bold">THE BLOB</span>
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
                <span className="text-sm font-bold">THE BLOB</span>
                <div className="flex items-center gap-2">
                  {/* Animated thinking dots */}
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-blob-mint rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-blob-mint rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-blob-mint rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-sm">{thinkingMessage}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t-2 border-blob-cobalt bg-blob-violet p-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-black border-2 border-blob-cobalt text-white font-mono focus:outline-none focus:border-blob-mint focus:shadow-[4px_4px_0px_#4FFFB0] transition-all"
                  placeholder="Chat to The Blob..."
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
