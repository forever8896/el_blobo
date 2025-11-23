"use client";

import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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

interface TestJobConversationProps {
  userAddress: string;
  username: string;
}

export function TestJobConversation({ userAddress, username }: TestJobConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [vaultBalance, setVaultBalance] = useState<string>('Loading...');
  const [currentJob, setCurrentJob] = useState<JobDetails | null>(null);
  const [jobAccepted, setJobAccepted] = useState(false);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [councilVotes, setCouncilVotes] = useState<CouncilVote[]>([]);
  const [showResults, setShowResults] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = `🫧 INITIALIZATION COMPLETE

Welcome back, ${username}.

I've reviewed your profile. Let's find you some work.

What kind of tasks are you interested in? Or tell me what you're good at, and I'll match you with opportunities.`;

      setMessages([{ role: 'assistant', content: greeting }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isThinking) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      const response = await fetch('/api/test-job/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          messages: [...messages, userMessage],
          availableBalance: vaultBalance
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message
        };
        setMessages(prev => [...prev, assistantMessage]);

        // If AI offered a job, save the details
        if (data.isJobOffer && data.jobDetails) {
          setCurrentJob(data.jobDetails);
        }
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: `❌ ERROR: ${data.error || 'Failed to process message'}`
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ CONNECTION ERROR: Failed to reach The Blob servers.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleAcceptJob = () => {
    setJobAccepted(true);
    const acceptMessage: Message = {
      role: 'assistant',
      content: `✅ JOB ACCEPTED

Contract generated. You have **${currentJob?.deadline || '7 days'}** to complete this work.

When you're done, submit your work below and it will be evaluated by the AI Council.`
    };
    setMessages(prev => [...prev, acceptMessage]);
  };

  const handleSubmitWork = async () => {
    if (!submissionUrl.trim() || !currentJob) return;

    setIsSubmitting(true);

    try {
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

        const submittedMessage: Message = {
          role: 'assistant',
          content: '⚖️ SUBMISSION RECEIVED\n\nYour work has been sent to the AI Council for evaluation.\n\nStand by...'
        };
        setMessages(prev => [...prev, submittedMessage]);

        // Wait a moment then show results
        setTimeout(() => {
          setShowResults(true);
          const approvalCount = data.councilResults.filter((v: CouncilVote) => v.vote).length;
          const isApproved = approvalCount >= 2;

          const resultMessage: Message = {
            role: 'assistant',
            content: isApproved
              ? `✅ VERDICT: APPROVED (${approvalCount}/3 judges)\n\nPayment of **${currentJob.reward} RON** is being processed.\n\nWell done.`
              : `❌ VERDICT: REJECTED (${approvalCount}/3 judges)\n\nThe council found your work below standards. Review their feedback and try again.`
          };
          setMessages(prev => [...prev, resultMessage]);
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting work:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ SUBMISSION FAILED: Could not reach the council.'
      };
      setMessages(prev => [...prev, errorMessage]);
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
          <span className="text-blob-peach text-sm">SYSTEM_STATUS:</span>{' '}
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
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl p-4 rounded font-mono text-sm ${
                  message.role === 'user'
                    ? 'bg-blob-cobalt text-white border-2 border-blob-mint'
                    : 'bg-blob-violet border-2 border-blob-cobalt text-gray-200'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </m.div>
          ))}

          {/* Job Accept Button */}
          {currentJob && !jobAccepted && (
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
          {jobAccepted && !showResults && (
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
