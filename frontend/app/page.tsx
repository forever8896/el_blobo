"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const savedWallet = localStorage.getItem('userWallet');
        const savedUsername = localStorage.getItem('username');

        if (savedWallet && savedUsername) {
           // Basic check passed, redirect to dashboard which will do full verification
           router.push('/dashboard');
        } else {
           // No session, redirect to the start of the flow
           router.push('/start/chart');
        }
      } catch (error) {
        console.error('Error checking session:', error);
        router.push('/start/chart');
      } finally {
        // In case we are still mounted (though push should unmount)
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="fixed inset-0 bg-blob-violet flex items-center justify-center">
       {/* Simple loading state */}
       <div className="text-blob-mint animate-pulse font-mono">INITIALIZING...</div>
    </div>
  );
}