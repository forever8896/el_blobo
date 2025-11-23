import { NextResponse } from "next/server";

/**
 * Twitter Search API using Grok's Agentic Tool Calling
 *
 * Uses Grok-4-fast with x_search tool for real-time Twitter data
 */

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!process.env.GROK_API_KEY) {
      return NextResponse.json({
        error: "Grok API key not configured",
        sentiment: null,
      }, { status: 500 });
    }

    // Use Grok's agentic tool calling with x_search
    const grokResponse = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-4-fast",
        messages: [
          {
            role: "system",
            content: `You are a Ronin blockchain ecosystem analyst. Analyze recent tweets about the Ronin blockchain and return ONLY a valid JSON object with this exact structure:
{
  "sentiment_score": <number between -1 and 1>,
  "trending_topics": [<array of 3-5 trending topics specific to Ronin ecosystem>],
  "insights": [<array of 3-5 actionable insights about opportunities, pain points, or needs in the Ronin community>],
  "tweet_count": <estimated number of tweets analyzed>
}

Sentiment score guide:
- 1.0: Very positive, bullish, excited about Ronin
- 0.5: Moderately positive
- 0.0: Neutral
- -0.5: Moderately negative
- -1.0: Very negative, bearish, frustrated

Focus on:
- Gaming and NFT projects on Ronin
- DeFi and infrastructure needs
- Developer pain points and feature requests
- Community excitement and concerns
- Opportunities for builders and creators`
          },
          {
            role: "user",
            content: `Search X (Twitter) for recent tweets about: "${query}".

Focus on the Ronin blockchain ecosystem, including:
- Ronin network discussions
- Axie Infinity and gaming on Ronin
- RON token sentiment
- NFT projects and marketplaces on Ronin
- Developer and builder activity

Analyze tweets from the last 24-48 hours. Identify:
1. Overall sentiment toward Ronin
2. What's trending or generating buzz
3. Pain points or needs the community is discussing
4. Opportunities for builders and creators

Return insights that would help match skilled individuals with meaningful projects on Ronin.`
          }
        ],
        // Enable Live Search with X (Twitter) source
        search_parameters: {
          mode: "on",  // Force search to be enabled
          sources: [
            {
              type: "x",  // Search X (Twitter)
            }
          ],
          return_citations: true,
          max_search_results: 30,
        },
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text();
      console.error("Grok API error:", errorText);
      return NextResponse.json({
        error: "Grok API request failed",
        details: errorText,
      }, { status: grokResponse.status });
    }

    const grokData = await grokResponse.json();

    // Extract the response content
    const contentText = grokData.choices?.[0]?.message?.content || "{}";

    // Get citations (URLs from X posts)
    const citations = grokData.choices?.[0]?.message?.citations || [];

    // Get tool usage info
    const usage = grokData.usage || {};
    const toolCalls = grokData.choices?.[0]?.message?.tool_calls || [];

    // Parse the JSON response
    let parsedSentiment;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = contentText.match(/```json\s*([\s\S]*?)\s*```/) ||
                       contentText.match(/```\s*([\s\S]*?)\s*```/) ||
                       contentText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        parsedSentiment = JSON.parse(jsonStr);
      } else {
        // Fallback if no JSON found
        parsedSentiment = {
          sentiment_score: 0,
          trending_topics: ["Unable to parse response"],
          insights: [contentText.substring(0, 200)],
          tweet_count: 0
        };
      }
    } catch (parseError) {
      console.error("Failed to parse Grok response:", parseError);
      parsedSentiment = {
        sentiment_score: 0,
        trending_topics: [],
        insights: [contentText],
        tweet_count: 0
      };
    }

    return NextResponse.json({
      success: true,
      query,
      sentiment: parsedSentiment,
      citations,
      tool_calls: toolCalls.map((tc: { function?: { name?: string; arguments?: string } }) => ({
        tool: tc.function?.name,
        arguments: tc.function?.arguments,
      })),
      usage: {
        total_tokens: usage.total_tokens,
        server_side_tools: usage.server_side_tool_usage || {},
      },
      raw_response: contentText,
    });

  } catch (error) {
    console.error("Twitter search error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      sentiment: null,
    }, { status: 500 });
  }
}
