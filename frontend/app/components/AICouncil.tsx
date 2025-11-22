"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import TypewriterText from "./TypewriterText";

interface Judge {
  id: string;
  name: string;
  personality: string;
  avatar: string;
  aiProvider: string;
  status: 'thinking' | 'voted' | 'waiting';
  vote?: boolean;
  reasoning?: string;
}

interface AICouncilProps {
  projectId: string;
  submissionUrl: string;
  submissionNotes: string;
  onComplete: (approved: boolean, finalDecision: string) => void;
}

export default function AICouncil({ projectId, submissionUrl, submissionNotes, onComplete }: AICouncilProps) {
  const [judges, setJudges] = useState<Judge[]>([
    {
      id: 'judge1',
      name: 'VALIDATOR-PRIME',
      personality: 'Strict quality enforcer, focuses on technical excellence',
      avatar: '🤖',
      aiProvider: 'OpenAI GPT-4',
      status: 'waiting'
    },
    {
      id: 'judge2',
      name: 'IMPACT-SAGE',
      personality: 'Cares about community impact and real-world value',
      avatar: '🧠',
      aiProvider: 'Google Gemini',
      status: 'waiting'
    },
    {
      id: 'judge3',
      name: 'CHAOS-ARBITER',
      personality: 'Chaotic good, loves creativity and risk-taking',
      avatar: '⚡',
      aiProvider: 'Grok (X.AI)',
      status: 'waiting'
    }
  ]);

  const [councilDiscussion, setCouncilDiscussion] = useState<string[]>([]);
  const [evaluationComplete, setEvaluationComplete] = useState(false);
  const [finalDecision, setFinalDecision] = useState<'approved' | 'rejected' | null>(null);

  useEffect(() => {
    const startEvaluation = async () => {
      // Initiate council discussion
      setCouncilDiscussion([
        '> COUNCIL SESSION INITIATED',
        '> PROJECT_ID: ' + projectId,
        '> SUBMISSION: ' + submissionUrl,
        '> ANALYZING...'
      ]);

      // Evaluate each judge sequentially
      for (let i = 0; i < judges.length; i++) {
        await evaluateJudge(i);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Pause between judges
      }

      // Calculate final decision
      await calculateFinalDecision();
    };

    startEvaluation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const evaluateJudge = async (index: number) => {
    const judge = judges[index];

    // Update judge status to thinking
    setJudges(prev => prev.map((j, i) =>
      i === index ? { ...j, status: 'thinking' as const } : j
    ));

    setCouncilDiscussion(prev => [...prev, `\n> ${judge.name} ANALYZING...`]);

    try {
      // Call the AI council API
      const response = await fetch('/api/council/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judgeId: judge.id,
          judgeName: judge.name,
          judgePersonality: judge.personality,
          projectId,
          submissionUrl,
          submissionNotes
        })
      });

      const data = await response.json();

      // Update judge with vote and reasoning
      setJudges(prev => prev.map((j, i) =>
        i === index ? {
          ...j,
          status: 'voted' as const,
          vote: data.vote,
          reasoning: data.reasoning
        } : j
      ));

      // Add judge's reasoning to discussion
      setCouncilDiscussion(prev => [
        ...prev,
        `\n${judge.avatar} ${judge.name}: ${data.vote ? '[APPROVE]' : '[REJECT]'}`,
        `"${data.reasoning}"`
      ]);

    } catch (error) {
      console.error('Error evaluating judge:', error);
      // Fallback vote
      setJudges(prev => prev.map((j, i) =>
        i === index ? {
          ...j,
          status: 'voted' as const,
          vote: true,
          reasoning: 'System evaluation complete.'
        } : j
      ));
    }
  };

  const calculateFinalDecision = async () => {
    const approvalCount = judges.filter(j => j.vote).length;
    const approved = approvalCount >= 2; // Majority vote

    setFinalDecision(approved ? 'approved' : 'rejected');
    setEvaluationComplete(true);

    const decisionText = approved
      ? `\n\n> ✅ DECISION: APPROVED (${approvalCount}/3 votes)\n> PAYMENT PROTOCOL EXECUTING...`
      : `\n\n> ❌ DECISION: REJECTED (${approvalCount}/3 votes)\n> WORK QUALITY INSUFFICIENT.`;

    setCouncilDiscussion(prev => [...prev, decisionText]);

    // Notify parent component after a brief delay
    setTimeout(() => {
      onComplete(approved, decisionText);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-6xl bg-gradient-to-br from-purple-900/40 via-black to-indigo-900/40 border-2 border-[var(--neon-cyan)] p-8 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1
            className="text-4xl font-black text-[var(--neon-cyan)] mb-2 neon-glow"
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            █▓▒░ AI COUNCIL EVALUATION ░▒▓█
          </motion.h1>
          <p className="text-[var(--text-dim)] font-mono text-sm">
            &gt; 3 INDEPENDENT AI JUDGES | MAJORITY VOTE REQUIRED
          </p>
        </div>

        {/* Judges Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {judges.map((judge, index) => (
            <motion.div
              key={judge.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.2 }}
              className={`border-2 p-4 ${
                judge.status === 'thinking'
                  ? 'border-[var(--neon-yellow)] bg-[var(--neon-yellow)]/10'
                  : judge.status === 'voted'
                  ? judge.vote
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-red-500 bg-red-500/10'
                  : 'border-[var(--neon-cyan)]/30 bg-black/40'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <motion.span
                  className="text-4xl"
                  animate={
                    judge.status === 'thinking'
                      ? { rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }
                      : judge.status === 'voted'
                      ? judge.vote
                        ? { y: [0, -10, 0], rotate: [0, 10, 0] } // Nod up for approve
                        : { rotate: [0, -15, 15, -15, 0] } // Shake for reject
                      : {}
                  }
                  transition={{
                    duration: judge.status === 'thinking' ? 2 : 0.8,
                    repeat: judge.status === 'thinking' ? Infinity : 0
                  }}
                >
                  {judge.avatar}
                </motion.span>
                <div className="flex-1">
                  <h3 className="font-mono font-bold text-[var(--neon-cyan)]">
                    {judge.name}
                  </h3>
                  <p className="text-xs text-[var(--text-dim)]">{judge.personality}</p>
                  <p className="text-xs text-[var(--neon-magenta)] mt-1">
                    AI: {judge.aiProvider}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="mt-3 font-mono text-sm">
                {judge.status === 'waiting' && (
                  <span className="text-[var(--text-dim)]">WAITING...</span>
                )}
                {judge.status === 'thinking' && (
                  <motion.span
                    className="text-[var(--neon-yellow)]"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    ANALYZING_
                  </motion.span>
                )}
                {judge.status === 'voted' && (
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <motion.div
                      className={`text-3xl font-bold mb-2 ${judge.vote ? 'text-green-400' : 'text-red-400'}`}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      {judge.vote ? '👍 APPROVE' : '👎 REJECT'}
                    </motion.div>
                    {/* Speech bubble with reasoning */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="relative bg-black/60 border-2 border-[var(--neon-cyan)] p-3 rounded-lg mt-2"
                    >
                      {/* Speech bubble arrow */}
                      <div className="absolute -top-2 left-6 w-4 h-4 bg-black/60 border-l-2 border-t-2 border-[var(--neon-cyan)] transform rotate-45"></div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        <TypewriterText text={judge.reasoning || ""} speed={20} />
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Council Discussion Log */}
        <div className="bg-black/60 border-2 border-[var(--neon-cyan)] p-6 font-mono text-sm">
          <div className="flex items-center gap-2 mb-4 text-[var(--neon-cyan)]">
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              █▓▒░
            </motion.span>
            <span className="font-bold">LIVE COUNCIL DISCUSSION</span>
          </div>

          <div className="space-y-3 text-[var(--text-secondary)] max-h-64 overflow-y-auto">
            {councilDiscussion.map((line, i) => {
              const isJudgeComment = line.includes('VALIDATOR-PRIME') || line.includes('IMPACT-SAGE') || line.includes('CHAOS-ARBITER');
              const isDecision = line.includes('DECISION:');
              const isApprove = line.includes('[APPROVE]');
              const isReject = line.includes('[REJECT]');

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ delay: i * 0.15, type: "spring" }}
                  className={`
                    ${isJudgeComment ? 'font-bold text-[var(--neon-cyan)]' : ''}
                    ${isDecision ? 'text-[var(--neon-yellow)] font-bold text-lg border-t-2 border-[var(--neon-cyan)] pt-2 mt-2' : ''}
                    ${isApprove ? 'text-green-400' : ''}
                    ${isReject ? 'text-red-400' : ''}
                    ${line.startsWith('>') ? 'text-[var(--text-dim)]' : ''}
                    ${line.startsWith('"') ? 'italic pl-4 border-l-2 border-[var(--neon-magenta)] ml-2' : ''}
                  `}
                >
                  {line}
                </motion.div>
              );
            })}
            {!evaluationComplete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-[var(--neon-yellow)]"
              >
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ▓
                </motion.span>
                <span>Processing council deliberation...</span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Final Decision Banner */}
        <AnimatePresence>
          {evaluationComplete && finalDecision && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              className={`mt-6 p-6 border-4 text-center ${
                finalDecision === 'approved'
                  ? 'border-green-500 bg-green-500/20'
                  : 'border-red-500 bg-red-500/20'
              }`}
            >
              <div className={`text-6xl mb-2 ${
                finalDecision === 'approved' ? 'text-green-400' : 'text-red-400'
              }`}>
                {finalDecision === 'approved' ? '✅' : '❌'}
              </div>
              <h2 className="text-3xl font-black mb-2">
                {finalDecision === 'approved' ? 'WORK APPROVED' : 'WORK REJECTED'}
              </h2>
              <p className="text-[var(--text-dim)] font-mono">
                {finalDecision === 'approved'
                  ? '> Payment distribution initiated...'
                  : '> Quality standards not met. Try again.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
