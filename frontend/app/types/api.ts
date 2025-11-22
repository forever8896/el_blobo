export type AgentRequest = {
  userMessage: string;
  walletAddress?: string;
};

export type AgentResponse = { response?: string; error?: string };
