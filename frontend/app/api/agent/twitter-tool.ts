import { tool } from "ai";
import { z } from "zod";

/**
 * Twitter Search Tool for AgentKit
 *
 * Allows the AI agent to search Twitter via Grok API
 */

export const twitterSearchTool = tool({
  description: `Search Twitter for sentiment analysis and trending topics.
  Use this to understand what the community wants and needs.
  Essential for assigning relevant jobs to users.`,

  parameters: z.object({
    query: z.string().describe("Search query (e.g., 'Base blockchain', 'crypto memes', '#DeFi')"),
  }),

  execute: async ({ query }) => {
    try {
      // Call our Twitter search API endpoint
      const response = await fetch("http://localhost:3000/api/twitter-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const error = await response.json();
        return `Twitter search failed: ${error.error || 'Unknown error'}`;
      }

      const data = await response.json();

      if (!data.success || !data.sentiment) {
        return `Twitter search returned no results for "${query}". Try a different query.`;
      }

      const sentiment = data.sentiment;

      // Format the response for the AI
      const result = `
TWITTER SENTIMENT ANALYSIS: "${query}"

Sentiment Score: ${sentiment.sentiment_score} (${
        sentiment.sentiment_score > 0.3 ? 'POSITIVE' :
        sentiment.sentiment_score < -0.3 ? 'NEGATIVE' :
        'NEUTRAL'
      })

Tweets Analyzed: ${sentiment.tweet_count || 'N/A'}

Trending Topics:
${sentiment.trending_topics?.map((topic: string, i: number) => `${i + 1}. ${topic}`).join('\n') || 'None'}

Key Insights:
${sentiment.insights?.map((insight: string, i: number) => `${i + 1}. ${insight}`).join('\n') || 'None'}

RECOMMENDATION: Use these insights to assign jobs that address community needs.
`;

      return result;

    } catch (error) {
      return `Twitter search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  },
});
