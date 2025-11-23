"use client";

import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useAgent } from '../hooks/useAgent';

interface JobDetails {
  title: string;
  description: string;
  reward: string;
  deadline: string;
  category: string;
}

interface CouncilVote {
  judgeId: string;
  judgeName: string;
  vote: boolean;
  reasoning: string;
  aiProvider: string;
  timestamp: string;
}

interface TestJobFlowProps {
  userAddress: string;
  username: string;
}

export function TestJobFlow({ userAddress, username }: TestJobFlowProps) {
  const [input, setInput] = useState('');
  const [vaultBalance, setVaultBalance] = useState<string>('Loading...');
  const [currentJob, setCurrentJob] = useState<JobDetails | null>(null);
  const [jobAccepted, setJobAccepted] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [councilVotes, setCouncilVotes] = useState<CouncilVote[]>([]);
  const [showResults, setShowResults] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use the existing agent hook (reuses /api/agent route)
  const { messages, sendMessage, isThinking } = useAgent(userAddress);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load vault balance on mount
  useEffect(() => {
    const loadVaultBalance = async () => {
      try {
        const response = await fetch('/api/vault/balance');
        const data = await response.json();
        if (data.success) {
          setVaultBalance(data.balance.ron);
        }
      } catch (error) {
        console.error('Error loading vault balance:', error);
        setVaultBalance('Unknown');
      }
    };

    loadVaultBalance();
  }, []);

  // Send initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      sendMessage(`Hello! I'm ${username} and I'd like to explore test jobs. What opportunities are available?`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Parse messages for job offers
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.sender === 'agent' && !currentJob) {
      // Try to extract job details from agent message
      const text = lastMessage.text;

      // Look for job offer indicators
      if (text.includes('JOB:') || text.includes('TASK:') || text.includes('PROJECT:')) {
        try {
          const titleMatch = text.match(/(?:JOB|TASK|PROJECT):\s*(.+)/i);
          const descMatch = text.match(/(?:DESCRIPTION|DESC):\s*(.+?)(?=REWARD|DEADLINE|$)/is);
          const rewardMatch = text.match(/REWARD:\s*([\d.]+)\s*RON/i);
          const deadlineMatch = text.match(/DEADLINE:\s*(.+)/i);

          if (titleMatch && rewardMatch) {
            setCurrentJob({
              title: titleMatch[1].trim(),
              description: descMatch ? descMatch[1].trim() : titleMatch[1].trim(),
              reward: rewardMatch[1],
              deadline: deadlineMatch ? deadlineMatch[1].trim() : '7 days',
              category: 'general'
            });
          }
        } catch (error) {
          console.error('Error parsing job offer:', error);
        }
      }
    }
  }, [messages, currentJob]);

  const handleSendMessage = async () => {
    if (!input.trim() || isThinking || jobAccepted) return;
    await sendMessage(input);
    setInput('');
  };

  const handleAcceptJob = async () => {
    setJobAccepted(true);
    await sendMessage(`YES - I accept this job. I'll get started right away.`);
  };

  const handleSubmitWork = async () => {
    if (!submissionUrl.trim() || !currentJob) return;

    setIsSubmitting(true);

    try {
      // Use the existing test-task submission route
      const response = await fetch('/api/test-task/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          username,
          taskTitle: currentJob.title,
          taskDescription: currentJob.description,
          submissionUrl,
          submissionNotes
        })
      });

      const data = await response.json();

      if (data.success && data.councilResults) {
        setCouncilVotes(data.councilResults);

        // Notify via agent
        await sendMessage(`I've submitted my work for "${currentJob.title}". URL: ${submissionUrl}`);

        // Wait a moment then show results
        setTimeout(() => {
          setShowResults(true);
          const approvalCount = data.councilResults.filter((v: CouncilVote) => v.vote).length;
          const isApproved = approvalCount >= 2;

          sendMessage(
            isApproved
              ? `The council APPROVED my work! (${approvalCount}/3 votes)`
              : `The council REJECTED my work. (${approvalCount}/3 votes) I'll review the feedback and improve.`
          );
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting work:', error);
      await sendMessage('ERROR: Failed to submit work to the council.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getApprovalRate = (): number => {
    if (councilVotes.length === 0) return 0;
    const approvals = councilVotes.filter(v => v.vote).length;
    return (approvals / councilVotes.length) * 100;
  };

  return (
    <div className="w-full max-w-6xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      {/* Header with Balance */}
      <div className="bg-black/60 border-2 border-blob-cobalt p-4 flex justify-between items-center">
        <div className="font-mono">
          <span className="text-blob-peach text-sm">TEST_MODE:</span>{' '}
          <span className="text-blob-mint font-bold">ACTIVE</span>
        </div>
        <div className="font-mono">
          <span className="text-blob-peach text-sm">VAULT_BALANCE:</span>{' '}
          <span className="text-white font-bold">{vaultBalance} RON</span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 bg-black/40 border-x-2 border-blob-cobalt overflow-y-auto p-6 space-y-4">
        <AnimatePresence>
          {messages.map((message, idx) => (
            <m.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl p-4 rounded font-mono text-sm ${
                  message.sender === 'user'
                    ? 'bg-blob-cobalt text-white border-2 border-blob-mint'
                    : 'bg-blob-violet border-2 border-blob-cobalt text-gray-200'
                }`}
              >
                {message.sender === 'agent' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>
                      {message.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.text}</p>
                )}
              </div>
            </m.div>
          ))}

          {/* Job Accept Button */}
          {currentJob && !jobAccepted && !showResults && (
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center"
            >
              <button
                onClick={handleAcceptJob}
                className="px-8 py-4 bg-blob-mint border-2 border-blob-cobalt text-blob-violet text-lg font-bold font-mono hover:shadow-[6px_6px_0px_#1E4CDD] transition-all"
              >
                ✅ ACCEPT JOB
              </button>
            </m.div>
          )}

          {/* Work Submission Form */}
          {jobAccepted && !showResults && currentJob && (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-black border-2 border-blob-mint p-6 space-y-4"
            >
              <h4 className="text-xl font-bold text-blob-mint font-mono">
                📤 SUBMIT YOUR WORK
              </h4>

              <div className="space-y-2">
                <label className="block text-sm font-mono text-white">
                  SUBMISSION URL
                </label>
                <input
                  type="text"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-blob-violet border-2 border-blob-cobalt text-white placeholder-gray-500 focus:outline-none focus:border-blob-mint font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-mono text-white">
                  NOTES (Optional)
                </label>
                <textarea
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Describe what you did..."
                  rows={3}
                  className="w-full px-4 py-3 bg-blob-violet border-2 border-blob-cobalt text-white placeholder-gray-500 focus:outline-none focus:border-blob-mint font-mono resize-none"
                />
              </div>

              <button
                onClick={handleSubmitWork}
                disabled={!submissionUrl || isSubmitting}
                className={`w-full py-4 border-2 text-xl font-bold font-mono transition-all ${
                  submissionUrl && !isSubmitting
                    ? 'bg-blob-mint border-blob-cobalt text-blob-violet hover:shadow-[6px_6px_0px_#1E4CDD]'
                    : 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'SUBMITTING TO COUNCIL...' : 'SUBMIT TO COUNCIL'}
              </button>
            </m.div>
          )}

          {/* Council Results */}
          {showResults && councilVotes.length > 0 && (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className={`p-6 border-4 text-center ${
                getApprovalRate() >= 66.67
                  ? 'bg-green-900/20 border-green-500'
                  : 'bg-red-900/20 border-red-500'
              }`}>
                <h3 className={`text-3xl font-display font-bold ${
                  getApprovalRate() >= 66.67 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {getApprovalRate() >= 66.67 ? '✅ APPROVED' : '❌ REJECTED'}
                </h3>
                <p className="text-lg font-mono text-white mt-2">
                  {getApprovalRate().toFixed(0)}% approval rate
                </p>
              </div>

              {councilVotes.map((vote, idx) => (
                <m.div
                  key={vote.judgeId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.2 }}
                  className={`p-4 border-2 rounded ${
                    vote.vote
                      ? 'bg-green-900/10 border-green-500'
                      : 'bg-red-900/10 border-red-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="text-lg font-bold text-white font-mono">
                        {vote.vote ? '✅' : '❌'} {vote.judgeName}
                      </h5>
                      <p className="text-xs text-gray-400 font-mono">{vote.aiProvider}</p>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm italic">&quot;{vote.reasoning}&quot;</p>
                </m.div>
              ))}
            </m.div>
          )}

          {isThinking && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-blob-violet border-2 border-blob-cobalt p-4 rounded font-mono text-sm text-gray-400">
                <span className="animate-pulse">THE_BLOB is thinking...</span>
              </div>
            </m.div>
          )}

          <div ref={messagesEndRef} />
        </AnimatePresence>
      </div>

      {/* Input Box */}
      <div className="bg-black/60 border-2 border-blob-cobalt p-4 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="> TYPE_MESSAGE"
          disabled={isThinking || jobAccepted}
          className="flex-1 px-4 py-3 bg-blob-violet border-2 border-blob-cobalt text-white placeholder-gray-500 focus:outline-none focus:border-blob-mint font-mono disabled:opacity-50"
        />
        <button
          onClick={handleSendMessage}
          disabled={!input.trim() || isThinking || jobAccepted}
          className={`px-8 py-3 border-2 font-bold font-mono transition-all ${
            input.trim() && !isThinking && !jobAccepted
              ? 'bg-blob-mint border-blob-cobalt text-blob-violet hover:shadow-[4px_4px_0px_#1E4CDD]'
              : 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed'
          }`}
        >
          SEND
        </button>
      </div>
    </div>
  );
}
