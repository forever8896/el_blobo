/**
 * Onboarding Data Types
 */

export interface OnboardingData {
  username: string;
  walletAddress: string;
  referrerAddress?: string;
  agreedToMission: boolean;
  depositCompleted: boolean;
  interviewResponses?: string[];
}
