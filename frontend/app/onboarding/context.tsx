"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

interface OnboardingState {
  username: string;
  walletAddress: string;
  referrerAddress?: string;
  agreedToMission: boolean;
  depositCompleted: boolean;
  interviewResponses: string[];
}

interface OnboardingContextType {
  state: OnboardingState;
  updateState: (updates: Partial<OnboardingState>) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY = 'onboarding_state';

export function OnboardingProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage if available
  const [state, setState] = useState<OnboardingState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved onboarding state:', e);
        }
      }
    }
    return {
      username: "",
      walletAddress: "",
      agreedToMission: false,
      depositCompleted: false,
      interviewResponses: [],
    };
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  // Memoize updateState to prevent infinite loops
  const updateState = useCallback((updates: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <OnboardingContext.Provider value={{ state, updateState }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
