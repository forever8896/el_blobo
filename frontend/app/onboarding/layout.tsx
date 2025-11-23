"use client";

import { OnboardingProvider } from "./context";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-blob-violet text-white flex items-center justify-center p-4 overflow-hidden relative">
        {/* Background geometric shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-10 left-10 w-32 h-32 border-4 border-blob-cobalt opacity-20 rotate-12" />
          <div className="absolute bottom-20 right-20 w-64 h-64 border-4 border-blob-mint opacity-10 -rotate-12" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-blob-cobalt/10 rounded-full" />
        </div>

        <div className="w-full max-w-3xl z-10">
          {children}
        </div>
      </div>
    </OnboardingProvider>
  );
}
