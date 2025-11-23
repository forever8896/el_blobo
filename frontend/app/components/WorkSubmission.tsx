"use client";

import { m } from "framer-motion";
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
    <div className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center p-4">
      <m.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-3xl bg-blob-violet border-2 border-blob-cobalt p-8 shadow-[8px_8px_0px_#1E4CDD]"
      >
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-blob-cobalt pb-6">
          <m.div
            className="text-6xl mb-4"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            📤
          </m.div>
          <h2 className="text-3xl font-black text-white mb-2 font-display">
            SUBMIT YOUR WORK
          </h2>
          <p className="text-blob-peach font-mono text-sm">
            &gt; The AI Council will evaluate your submission
          </p>
        </div>

        {/* Project Details */}
        <div className="bg-black border-2 border-blob-cobalt p-6 mb-6">
          <div className="space-y-3 font-mono">
            <div>
              <span className="text-blob-peach text-sm">&gt; PROJECT:</span>
              <p className="text-lg text-blob-mint font-bold">{project.title}</p>
            </div>
            <div>
              <span className="text-blob-peach text-sm">&gt; DESCRIPTION:</span>
              <p className="text-white">{project.description}</p>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-blob-cobalt">
              <div>
                <span className="text-blob-peach text-sm">&gt; PAYMENT:</span>
                <p className="text-xl text-blob-green font-bold">${project.price_estimate}</p>
              </div>
              <div className="text-right">
                <span className="text-blob-peach text-sm">&gt; TIME LEFT:</span>
                <p className={`text-xl font-bold ${
                  timeRemaining() === 'EXPIRED' ? 'text-red-400' : 'text-blob-orange'
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
            <label className="text-sm text-blob-mint font-mono mb-2 block font-bold">
              &gt; SUBMISSION URL (Required) *
            </label>
            <input
              type="url"
              value={submissionUrl}
              onChange={(e) => setSubmissionUrl(e.target.value)}
              placeholder="https://github.com/yourwork or https://drive.google.com/..."
              className="w-full px-4 py-3 bg-black border-2 border-blob-cobalt text-white font-mono focus:outline-none focus:border-blob-mint focus:shadow-[4px_4px_0px_#4FFFB0] transition-all"
            />
            <p className="text-xs text-blob-peach mt-1 font-mono">
              * Provide a link to your work (GitHub, Drive, Figma, deployed site, etc.)
            </p>
          </div>

          {/* Notes Textarea */}
          <div>
            <label className="text-sm text-blob-mint font-mono mb-2 block font-bold">
              &gt; ADDITIONAL NOTES (Optional)
            </label>
            <textarea
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              placeholder="Explain your approach, challenges faced, or any additional context..."
              className="w-full px-4 py-3 bg-black border-2 border-blob-cobalt text-white font-mono focus:outline-none focus:border-blob-mint focus:shadow-[4px_4px_0px_#4FFFB0] transition-all resize-none h-32"
            />
          </div>

          {/* Warning */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blob-orange/10 border-l-4 border-blob-orange p-4"
          >
            <p className="text-sm text-blob-orange font-mono font-bold">
              ⚠️ WARNING: Your work will be evaluated by 3 independent AI judges.
              <br />
              They will check quality, effort, and alignment with requirements.
              <br />
              Majority vote (2/3) required for approval.
            </p>
          </m.div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-8 py-3 border-2 border-gray-600 text-gray-400 hover:text-white hover:border-white font-mono font-bold transition-colors disabled:opacity-50"
            >
              [CANCEL]
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !submissionUrl.trim()}
              className={`px-8 py-3 font-mono font-bold transition-all border-2 ${
                isSubmitting || !submissionUrl.trim()
                  ? 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed'
                  : 'bg-blob-cobalt border-blob-mint text-white hover:shadow-[4px_4px_0px_#4FFFB0] hover:-translate-y-1'
              }`}
            >
              {isSubmitting ? '[SUBMITTING...]' : '[SUBMIT FOR REVIEW]'}
            </button>
          </div>
        </div>
      </m.div>
    </div>
  );
}
