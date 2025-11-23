"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

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

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>({
    username: "",
    walletAddress: "",
    agreedToMission: false,
    depositCompleted: false,
    interviewResponses: [],
  });

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
