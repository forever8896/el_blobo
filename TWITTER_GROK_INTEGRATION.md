# Twitter Search Integration with Grok API

## ✅ What Was Fixed

The Grok API key was added to `.env` but wasn't actually being used. I've now properly integrated it.

---

## 🔧 New Components

### 1. **Twitter Search API Route** (`/app/api/twitter-search/route.ts`)

Endpoint that calls Grok API to search Twitter and analyze sentiment.

**How it works:**
```typescript
POST /api/twitter-search
Body: { query: "Base blockchain" }

Response: {
  success: true,
  sentiment: {
    sentiment_score: 0.7,  // -1 to 1
    trending_topics: ["DeFi", "NFTs", "Memes"],
    insights: ["Users want better UX", "Memecoin fatigue"],
    tweet_count: 150
  }
}
```

**Grok API Call:**
- Model: `grok-beta`
- Endpoint: `https://api.x.ai/v1/chat/completions`
- Uses your `GROK_API_KEY` from `.env`

### 2. **Twitter Search Tool** (`/app/api/agent/twitter-tool.ts`)

Custom AI tool that THE BLOB can use to search Twitter.

**Tool Definition:**
```typescript
{
  name: "twitter_search",
  description: "Search Twitter for sentiment and trending topics",
  parameters: {
    query: "Search query (e.g., 'crypto memes')"
  }
}
```

### 3. **Updated Agent Configuration** (`create-agent.ts`)

The Blob now has access to the Twitter search tool:

```typescript
const tools = hasGrokAPI
  ? { ...agentkitTools, twitter_search: twitterSearchTool }
  : agentkitTools;
```

**System Prompt Updated:**
- Checks if `GROK_API_KEY` exists
- If YES: Enables Twitter search + tells AI how to use it
- If NO: Warns AI that Twitter search is unavailable

---

## 🧪 How to Test

### 1. Verify Grok API Key
```bash
# Check .env has the key
grep GROK_API_KEY /home/deepseek/ethglobal-aires/frontend/.env
```

Should show:
```
GROK_API_KEY=xai-your-api-key-here
```

### 2. Test Twitter Search Endpoint Directly

```bash
curl -X POST http://localhost:3000/api/twitter-search \
  -H "Content-Type: application/json" \
  -d '{"query": "Base blockchain"}'
```

Expected response:
```json
{
  "success": true,
  "query": "Base blockchain",
  "sentiment": {
    "sentiment_score": 0.X,
    "trending_topics": [...],
    "insights": [...]
  }
}
```

### 3. Test with THE BLOB

Start the app and ask:
```
"What's the Twitter sentiment about Base blockchain?"
```

THE BLOB should:
1. Use the `twitter_search` tool
2. Call the API with query "Base blockchain"
3. Return sentiment analysis
4. Suggest jobs based on insights

---

## 🎯 Example Conversation

**User:** "What jobs should I work on?"

**THE BLOB:**
```
> INITIATING TWITTER_SEARCH protocol...
> Query: "Base Sepolia blockchain"
>
> SENTIMENT ANALYSIS COMPLETE:
> Score: -0.4 (NEGATIVE)
> Trending: ["Poor documentation", "Need more tutorials", "UI is confusing"]
>
> ASSIGNMENT: Based on your frontend.skills and chain.sentiment:
>
> JOB_ID: #001
> Task: Create video tutorial explaining Base Sepolia deployment
> Budget: $200
> Deadline: 72h
>
> ACCEPT? [Y/N]
```

---

## 🐛 Troubleshooting

### Error: "Grok API request failed"

**Check 1:** Verify API key is valid
```bash
curl -X POST https://api.x.ai/v1/chat/completions \
  -H "Authorization: Bearer $GROK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"grok-beta","messages":[{"role":"user","content":"test"}]}'
```

**Check 2:** Look at server logs
```bash
# The error details will be logged
# Check terminal where `npm run dev` is running
```

### Error: "Twitter search tool not found"

**Fix:** Make sure the agent is recreated
```bash
# Stop dev server (Ctrl+C)
# Delete cached agent
rm -f frontend/wallet_data.txt
# Restart
npm run dev
```

### Error: ETIMEDOUT

This is the timeout error you saw. It means:
- Grok API is taking too long to respond
- OR the fetch is timing out

**Solution:**
1. Increase timeout in `twitter-search/route.ts`
2. OR use a faster query (shorter search terms)

---

## 💡 How THE BLOB Uses Twitter Search

**Workflow:**
1. User completes onboarding interview
2. THE BLOB analyzes user skills
3. THE BLOB calls `twitter_search("Base blockchain")`
4. Grok searches Twitter for recent sentiment
5. THE BLOB matches:
   - What Twitter says is needed
   - What user is good at
6. THE BLOB assigns job with dynamic pricing

**Example:**
- Twitter says: "Need better memes"
- User skills: "Creative, funny, good at design"
- THE BLOB: "CREATE MEME TASK. Budget: $150. Deadline: 48h."

---

## 🔐 Security Note

The Grok API key is stored in `.env` (server-side only).
It's NEVER exposed to the client/browser.

All Twitter searches happen server-side via the API route.

---

## 📊 Rate Limits

Grok API has rate limits (check x.ai docs).

If you hit limits, the API will return 429.

Handle this gracefully:
```typescript
if (grokResponse.status === 429) {
  return "Twitter search rate limited. Try again in 1 minute."
}
```

---

## ✅ Summary

**What you have now:**
- ✅ Grok API key configured
- ✅ Twitter search endpoint (`/api/twitter-search`)
- ✅ Custom AI tool for THE BLOB
- ✅ Agent can now search Twitter
- ✅ Sentiment analysis for job assignment

**Next steps:**
1. Test the Twitter search endpoint
2. Ask THE BLOB about jobs
3. Watch it use Twitter sentiment to assign tasks

---

**The BLOB can now read Twitter and assign jobs based on what the community actually needs! 🫧**
