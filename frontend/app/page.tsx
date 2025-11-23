"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LandingPage from "./components/LandingPage";

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
           setIsCheckingSession(false);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [router]);

  if (isCheckingSession) {
    return (
      <div className="fixed inset-0 bg-blob-violet flex items-center justify-center">
         {/* A simple loading state while we check session */}
      </div>
    );
  }

  return (
    <LandingPage onEnter={() => router.push('/onboarding')} />
  );
}