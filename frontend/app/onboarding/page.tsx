"use client";

import { useRouter } from "next/navigation";
import OnboardingFlow, { OnboardingData } from "../components/OnboardingFlow";

export default function OnboardingPage() {
  const router = useRouter();
  
  const handleOnboardingComplete = async (data: OnboardingData) => {
    try {
      // Register user in database
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: data.walletAddress,
          username: data.username,
          interviewResponses: data.interviewResponses,
          referrerAddress: data.referrerAddress
        })
      });

      const result = await response.json();

      if (result.success) {
        // Save to localStorage for session persistence
        localStorage.setItem('userWallet', data.walletAddress);
        localStorage.setItem('username', data.username);
        localStorage.setItem('onboardingComplete', 'true');

        // Initialize the agent with the new user context
        // Note: Since we are redirecting immediately, we might want to let the Dashboard handle the welcome message
        // to ensure the user sees it. 
        // However, the original code sent it here. Let's stick to that pattern but ensure we await it.
        // Actually, since we are changing pages, the "messages" state of useAgent here will be lost.
        // Unless useAgent persists to DB immediately.
        // A safer bet for a smooth UX in a multi-page app is to just redirect, 
        // and let the Dashboard detect it's a new session or just load the history.
        
        // For now, let's redirect.
        router.push('/dashboard');
      } else {
        console.error('Registration failed:', result.message);
        alert(`Registration failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error during registration:', error);
      alert('Failed to complete registration. Please try again.');
    }
  };

  return (
    <OnboardingFlow
      referrerName={undefined}
      onComplete={handleOnboardingComplete}
    />
  );
}
