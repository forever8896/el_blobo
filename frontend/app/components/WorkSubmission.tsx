"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface WorkSubmissionProps {
  project: {
    id: string;
    title: string;
    description: string;
    price_estimate: number;
    deadline_end: Date;
  };
  onSubmit: (submissionUrl: string, submissionNotes: string) => void;
  onCancel: () => void;
}

export default function WorkSubmission({ project, onSubmit, onCancel }: WorkSubmissionProps) {
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!submissionUrl.trim()) {
      alert('Please provide a submission URL');
      return;
    }

    setIsSubmitting(true);

    // Validate URL format
    try {
      new URL(submissionUrl);
    } catch {
      alert('Please enter a valid URL');
      setIsSubmitting(false);
      return;
    }

    onSubmit(submissionUrl, submissionNotes);
  };

  const timeRemaining = () => {
    const now = new Date();
    const deadline = new Date(project.deadline_end);
    const diff = deadline.getTime() - now.getTime();

    if (diff <= 0) return 'EXPIRED';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-3xl bg-gradient-to-br from-purple-900/40 via-black to-indigo-900/40 border-2 border-[var(--neon-magenta)] p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            📤
          </motion.div>
          <h2 className="text-3xl font-black text-[var(--neon-magenta)] mb-2 neon-glow">
            SUBMIT YOUR WORK
          </h2>
          <p className="text-[var(--text-dim)] font-mono text-sm">
            &gt; The AI Council will evaluate your submission
          </p>
        </div>

        {/* Project Details */}
        <div className="bg-black/60 border-2 border-[var(--neon-cyan)] p-6 mb-6">
          <div className="space-y-3 font-mono">
            <div>
              <span className="text-[var(--text-dim)] text-sm">&gt; PROJECT:</span>
              <p className="text-lg text-[var(--neon-cyan)] font-bold">{project.title}</p>
            </div>
            <div>
              <span className="text-[var(--text-dim)] text-sm">&gt; DESCRIPTION:</span>
              <p className="text-[var(--text-secondary)]">{project.description}</p>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-[var(--neon-cyan)]/30">
              <div>
                <span className="text-[var(--text-dim)] text-sm">&gt; PAYMENT:</span>
                <p className="text-xl text-green-400 font-bold">${project.price_estimate}</p>
              </div>
              <div className="text-right">
                <span className="text-[var(--text-dim)] text-sm">&gt; TIME LEFT:</span>
                <p className={`text-xl font-bold ${
                  timeRemaining() === 'EXPIRED' ? 'text-red-400' : 'text-[var(--neon-yellow)]'
                }`}>
                  {timeRemaining()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submission Form */}
        <div className="space-y-6">
          {/* URL Input */}
          <div>
            <label className="text-sm text-[var(--text-dim)] font-mono mb-2 block">
              &gt; SUBMISSION URL (Required) *
            </label>
            <input
              type="url"
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              placeholder="https://github.com/yourwork or https://drive.google.com/..."
              className="w-full px-4 py-3 bg-black/60 border-2 border-[var(--neon-magenta)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--neon-cyan)] transition-colors"
            />
            <p className="text-xs text-[var(--text-dim)] mt-1">
              * Provide a link to your work (GitHub, Drive, Figma, deployed site, etc.)
            </p>
          </div>

          {/* Notes Textarea */}
          <div>
            <label className="text-sm text-[var(--text-dim)] font-mono mb-2 block">
              &gt; ADDITIONAL NOTES (Optional)
            </label>
            <textarea
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              placeholder="Explain your approach, challenges faced, or any additional context..."
              className="w-full px-4 py-3 bg-black/60 border-2 border-[var(--neon-magenta)] text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--neon-cyan)] transition-colors resize-none h-32"
            />
          </div>

          {/* Warning */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[var(--neon-yellow)]/10 border-l-4 border-[var(--neon-yellow)] p-4"
          >
            <p className="text-sm text-[var(--neon-yellow)] font-mono">
              ⚠️ WARNING: Your work will be evaluated by 3 independent AI judges.
              <br />
              They will check quality, effort, and alignment with requirements.
              <br />
              Majority vote (2/3) required for approval.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-mono font-bold transition-colors disabled:opacity-50"
            >
              [CANCEL]
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !submissionUrl.trim()}
              className={`px-8 py-3 font-mono font-bold transition-all ${
                isSubmitting || !submissionUrl.trim()
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-transparent border-2 border-[var(--neon-magenta)] text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)] hover:text-black neon-glow-box'
              }`}
            >
              {isSubmitting ? '[SUBMITTING...]' : '[SUBMIT FOR REVIEW]'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
