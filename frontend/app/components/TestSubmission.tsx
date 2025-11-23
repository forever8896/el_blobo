"use client";

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';

interface GeneratedTask {
  title: string;
  description: string;
  estimatedReward: string;
  category: string;
  generatedFor: string;
  generatedAt: string;
}

interface CouncilVote {
  judgeId: string;
  judgeName: string;
  vote: boolean;
  reasoning: string;
  aiProvider: string;
  timestamp: string;
}

interface TestSubmissionProps {
  userAddress: string;
  username: string;
}

export function TestSubmission({ userAddress, username }: TestSubmissionProps) {
  const [step, setStep] = useState<'idle' | 'generating' | 'task-generated' | 'submitting' | 'evaluating' | 'complete'>('idle');
  const [generatedTask, setGeneratedTask] = useState<GeneratedTask | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [councilVotes, setCouncilVotes] = useState<CouncilVote[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateTask = async () => {
    setStep('generating');
    setError(null);

    try {
      const response = await fetch('/api/test-task/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress, username })
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedTask(data.task);
        setStep('task-generated');
        // Auto-fill with example URLs based on category
        setSubmissionUrl(getExampleUrl(data.task.category));
        setSubmissionNotes(`This is a test submission for: ${data.task.title}`);
      } else {
        setError(data.error || 'Failed to generate task');
        setStep('idle');
      }
    } catch (err) {
      console.error('Error generating task:', err);
      setError('Failed to generate task');
      setStep('idle');
    }
  };

  const handleSubmitTask = async () => {
    if (!generatedTask) return;

    setStep('submitting');
    setError(null);

    try {
      const response = await fetch('/api/test-task/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress,
          username,
          taskTitle: generatedTask.title,
          taskDescription: generatedTask.description,
          submissionUrl,
          submissionNotes
        })
      });

      const data = await response.json();

      if (data.success) {
        setStep('evaluating');

        // Set council votes if available
        if (data.councilResults) {
          setCouncilVotes(data.councilResults);
          // Wait a moment for dramatic effect, then show results
          setTimeout(() => setStep('complete'), 1500);
        } else {
          setStep('complete');
        }
      } else {
        setError(data.error || 'Failed to submit task');
        setStep('task-generated');
      }
    } catch (err) {
      console.error('Error submitting task:', err);
      setError('Failed to submit task');
      setStep('task-generated');
    }
  };

  const getExampleUrl = (category: string): string => {
    const examples: Record<string, string> = {
      content: 'https://mirror.xyz/example-tutorial-post',
      code: 'https://github.com/example/awesome-project',
      design: 'https://figma.com/example-design',
      marketing: 'https://twitter.com/example/status/123456',
      documentation: 'https://docs.example.com/new-guide'
    };
    return examples[category] || 'https://example.com/my-submission';
  };

  const getApprovalRate = (): number => {
    if (councilVotes.length === 0) return 0;
    const approvals = councilVotes.filter(v => v.vote).length;
    return (approvals / councilVotes.length) * 100;
  };

  const isApproved = (): boolean => {
    return getApprovalRate() >= 66.67; // 2 out of 3 majority
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-6xl">🧪</div>
        <h2 className="text-3xl font-display font-bold text-blob-mint">
          TEST SUBMISSION FLOW
        </h2>
        <p className="text-lg text-blob-peach font-mono">
          Try out The Blob&apos;s AI Council without on-chain contracts
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-900/20 border-2 border-red-500 p-4 rounded"
        >
          <p className="text-red-400 font-mono text-sm">❌ ERROR: {error}</p>
        </m.div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Idle - Generate Task Button */}
        {step === 'idle' && (
          <m.div
            key="idle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center space-y-4"
          >
            <button
              onClick={handleGenerateTask}
              className="px-12 py-4 bg-blob-cobalt border-2 border-blob-mint text-white text-xl font-bold font-mono hover:shadow-[6px_6px_0px_#4FFFB0] hover:-translate-y-1 transition-all"
            >
              GENERATE TEST TASK
            </button>
            <p className="text-sm text-gray-400 font-mono">
              AI will create a realistic task for you to test submit
            </p>
          </m.div>
        )}

        {/* Step 2: Generating */}
        {step === 'generating' && (
          <m.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-4"
          >
            <div className="text-5xl animate-bounce">🤖</div>
            <p className="text-xl text-blob-mint font-mono animate-pulse">
              GENERATING TASK...
            </p>
          </m.div>
        )}

        {/* Step 3: Task Generated - Show Task & Submission Form */}
        {step === 'task-generated' && generatedTask && (
          <m.div
            key="task-generated"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Generated Task */}
            <div className="bg-blob-cobalt/20 border-2 border-blob-cobalt p-6 rounded space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-blob-mint mb-2">
                    {generatedTask.title}
                  </h3>
                  <p className="text-gray-300 mb-4">{generatedTask.description}</p>
                  <div className="flex gap-4 text-sm font-mono">
                    <span className="px-3 py-1 bg-blob-violet border border-blob-mint text-blob-mint">
                      {generatedTask.category.toUpperCase()}
                    </span>
                    <span className="px-3 py-1 bg-black border border-blob-peach text-blob-peach">
                      ~{generatedTask.estimatedReward} RON
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submission Form */}
            <div className="bg-black border-2 border-blob-mint p-6 rounded space-y-4">
              <h4 className="text-xl font-bold text-white font-mono mb-4">
                📤 SUBMIT YOUR WORK
              </h4>

              <div className="space-y-2">
                <label className="block text-sm font-mono text-blob-mint">
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
                <label className="block text-sm font-mono text-blob-mint">
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
                onClick={handleSubmitTask}
                disabled={!submissionUrl}
                className={`w-full py-4 border-2 text-xl font-bold font-mono transition-all ${
                  submissionUrl
                    ? 'bg-blob-mint border-blob-cobalt text-blob-violet hover:shadow-[6px_6px_0px_#1E4CDD]'
                    : 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed'
                }`}
              >
                SUBMIT TO COUNCIL
              </button>
            </div>
          </m.div>
        )}

        {/* Step 4: Submitting & Evaluating */}
        {(step === 'submitting' || step === 'evaluating') && (
          <m.div
            key="evaluating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-6"
          >
            <div className="text-6xl animate-pulse">⚖️</div>
            <div className="space-y-2">
              <p className="text-2xl text-blob-mint font-mono font-bold">
                {step === 'submitting' ? 'SUBMITTING...' : 'COUNCIL DELIBERATING...'}
              </p>
              <p className="text-sm text-gray-400 font-mono">
                3 AI judges are evaluating your submission
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <div className="w-3 h-3 bg-blob-mint rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 bg-blob-peach rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 bg-blob-cobalt rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </m.div>
        )}

        {/* Step 5: Complete - Show Results */}
        {step === 'complete' && councilVotes.length > 0 && (
          <m.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Result Banner */}
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className={`p-8 border-4 text-center ${
                isApproved()
                  ? 'bg-green-900/20 border-green-500'
                  : 'bg-red-900/20 border-red-500'
              }`}
            >
              <div className="text-8xl mb-4">{isApproved() ? '✅' : '❌'}</div>
              <h3 className={`text-4xl font-display font-bold mb-2 ${
                isApproved() ? 'text-green-400' : 'text-red-400'
              }`}>
                {isApproved() ? 'APPROVED' : 'REJECTED'}
              </h3>
              <p className="text-xl font-mono text-white">
                {getApprovalRate().toFixed(0)}% approval rate ({councilVotes.filter(v => v.vote).length}/3 judges)
              </p>
            </m.div>

            {/* Individual Votes */}
            <div className="space-y-4">
              <h4 className="text-xl font-bold text-blob-mint font-mono">
                JUDGE VERDICTS
              </h4>
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
                    <span className={`px-3 py-1 border font-mono text-sm ${
                      vote.vote
                        ? 'border-green-500 text-green-400'
                        : 'border-red-500 text-red-400'
                    }`}>
                      {vote.vote ? 'APPROVE' : 'REJECT'}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm italic">&quot;{vote.reasoning}&quot;</p>
                </m.div>
              ))}
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setStep('idle');
                setGeneratedTask(null);
                setCouncilVotes([]);
                setSubmissionUrl('');
                setSubmissionNotes('');
              }}
              className="w-full py-3 bg-blob-violet border-2 border-blob-cobalt text-white font-mono font-bold hover:border-blob-mint transition-all"
            >
              TRY ANOTHER SUBMISSION
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
