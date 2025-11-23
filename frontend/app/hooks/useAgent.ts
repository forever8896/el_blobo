import { useState, useEffect } from "react";
import { AgentRequest, AgentResponse } from "../types/api";

/**
 * Sends a user message to the AgentKit backend API and retrieves the agent's response.
 *
 * @async
 * @function callAgentAPI
 * @param {string} userMessage - The message sent by the user.
 * @returns {Promise<string | null>} The agent's response message or `null` if an error occurs.
 *
 * @throws {Error} Logs an error if the request fails.
 */
async function messageAgent(userMessage: string, walletAddress?: string): Promise<string | null> {
  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage, walletAddress } as AgentRequest),
    });

    const data = (await response.json()) as AgentResponse;
    return data.response ?? data.error ?? null;
  } catch (error) {
    console.error("Error communicating with agent:", error);
    return null;
  }
}

/**
 * Load chat history from database
 */
async function loadChatHistory(walletAddress: string): Promise<{ text: string; sender: "user" | "agent" }[]> {
  try {
    const response = await fetch(`/api/chat/history?walletAddress=${walletAddress}`);
    const data = await response.json();

    if (data.success && data.messages) {
      return data.messages.map((msg: any) => ({
        text: msg.content,
        sender: msg.role === 'assistant' ? 'agent' : 'user'
      }));
    }
    return [];
  } catch (error) {
    console.error("Error loading chat history:", error);
    return [];
  }
}

/**
 * Check if user needs automatic greeting and fetch it
 */
async function fetchAutoGreeting(walletAddress: string): Promise<string | null> {
  try {
    const response = await fetch('/api/chat/greeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    });

    const data = await response.json();

    if (data.success && data.shouldGreet && data.greeting) {
      return data.greeting;
    }
    return null;
  } catch (error) {
    console.error("Error fetching auto greeting:", error);
    return null;
  }
}

/**
 *
 * This hook manages interactions with the AI agent by making REST calls to the backend.
 * It also stores the local conversation state, tracking messages sent by the user and
 * responses from the agent.
 *
 * #### How It Works
 * - Loads chat history from database on mount
 * - `sendMessage(input)` sends a message to `/api/agent` and updates state.
 * - `messages` stores the chat history.
 * - `isThinking` tracks whether the agent is processing a response.
 *
 * #### See Also
 * - The API logic in `/api/agent.ts`
 *
 * @returns {object} An object containing:
 * - `messages`: The conversation history.
 * - `sendMessage`: A function to send a new message.
 * - `isThinking`: Boolean indicating if the agent is processing a response.
 */
export function useAgent(walletAddress?: string) {
  const [messages, setMessages] = useState<{ text: string; sender: "user" | "agent" }[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load chat history on mount and check for auto-greeting
  useEffect(() => {
    if (walletAddress) {
      const initializeChat = async () => {
        // First, load existing chat history
        const history = await loadChatHistory(walletAddress);
        setMessages(history);

        // Always check for auto-greeting (endpoint decides if greeting is needed)
        // Possible scenarios:
        // - New user with no chat history → AI-generated ecosystem greeting + task proposal
        // - User with active task (even with history) → Status check greeting
        // - User with chat history but no task → No automatic greeting
        const greeting = await fetchAutoGreeting(walletAddress);
        if (greeting) {
          // Greeting was generated and saved to DB, reload history to include it
          const updatedHistory = await loadChatHistory(walletAddress);
          setMessages(updatedHistory);
        }

        setIsLoadingHistory(false);
      };

      initializeChat();
    } else {
      setIsLoadingHistory(false);
    }
  }, [walletAddress]);

  /**
   * Sends a user message, updates local state, and retrieves the agent's response.
   *
   * @param {string} input - The message from the user.
   */
  const sendMessage = async (input: string) => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { text: input, sender: "user" }]);
    setIsThinking(true);

    const responseMessage = await messageAgent(input, walletAddress);

    if (responseMessage) {
      setMessages(prev => [...prev, { text: responseMessage, sender: "agent" }]);
    }

    setIsThinking(false);
  };

  return { messages, sendMessage, isThinking, isLoadingHistory };
}
