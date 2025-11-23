# Test Submission Flow

A testing interface for The Blob's AI Council evaluation system that doesn't require on-chain job contracts.

## Features

- **AI-Generated Tasks**: GPT-4 generates realistic tasks based on user context
- **Multi-AI Council**: 3 different AI judges evaluate submissions in parallel:
  - **VALIDATOR-PRIME** (OpenAI GPT-4) - Technical precision
  - **CHAOS-ARBITER** (Grok/X.AI) - Creative chaos
  - **IMPACT-SAGE** (Google Gemini) - Community impact
- **Real Database Integration**: Votes are saved to the council_votes table
- **Full Workflow**: Complete submission → evaluation → verdict flow

## How to Use

1. **Navigate to Test Page**
   - Click the `[🧪 TEST COUNCIL]` button in the dashboard header
   - Or visit `/test-submission` directly

2. **Generate a Task**
   - Click "GENERATE TEST TASK"
   - AI will create a realistic task with:
     - Title and description
     - Category (content, code, design, marketing, documentation)
     - Estimated reward in RON

3. **Submit Your Work**
   - Enter a submission URL (can be fake for testing)
   - Add optional notes
   - Click "SUBMIT TO COUNCIL"

4. **Council Evaluation**
   - 3 AI judges evaluate in parallel (~5-10 seconds)
   - Each provides a vote (APPROVE/REJECT) with reasoning
   - Majority vote (2/3) determines final verdict

5. **View Results**
   - See overall approval/rejection
   - Read each judge's individual reasoning
   - Try another submission

## Technical Details

### API Endpoints

#### `POST /api/test-task/generate`
Generates a test task using AI.

**Request:**
```json
{
  "userAddress": "0x...",
  "username": "alice"
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    "title": "Create NFT gallery widget",
    "description": "Build a responsive widget...",
    "estimatedReward": "1.5",
    "category": "code",
    "generatedFor": "alice",
    "generatedAt": "2024-01-23T..."
  }
}
```

#### `POST /api/test-task/submit`
Submits task and triggers council evaluation.

**Request:**
```json
{
  "userAddress": "0x...",
  "username": "alice",
  "taskTitle": "Create NFT gallery widget",
  "taskDescription": "Build a responsive widget...",
  "submissionUrl": "https://github.com/alice/nft-gallery",
  "submissionNotes": "Implemented with React and TypeScript"
}
```

**Response:**
```json
{
  "success": true,
  "project": { /* database project record */ },
  "councilResults": [
    {
      "judgeId": "validator_prime",
      "judgeName": "VALIDATOR-PRIME",
      "vote": true,
      "reasoning": "Clean code structure. TypeScript implementation is solid. APPROVED.",
      "aiProvider": "OpenAI GPT-4",
      "timestamp": "2024-01-23T..."
    },
    // ... 2 more judges
  ],
  "message": "Test task submitted and sent to council for evaluation"
}
```

### Database Schema

Council votes are saved to the `council_votes` table:

```sql
CREATE TABLE council_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  judge_id TEXT NOT NULL,
  judge_name TEXT,
  vote BOOLEAN NOT NULL,
  reason TEXT,
  ai_provider TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

### Component Architecture

```
/test-submission
  └─ page.tsx (Wallet connection + user loading)
      └─ TestSubmission.tsx (Main component)
          ├─ Step 1: Generate Task (AI creates task)
          ├─ Step 2: Submission Form (User enters URL/notes)
          ├─ Step 3: Council Evaluation (3 parallel AI calls)
          └─ Step 4: Results Display (Show votes + verdict)
```

## Environment Variables Required

```env
# AI Providers
OPENAI_API_KEY=sk-...           # For VALIDATOR-PRIME
GROK_API_KEY=xai-...            # For CHAOS-ARBITER
GOOGLE_API_KEY=AI...            # For IMPACT-SAGE

# Database
POSTGRES_URL=postgres://...     # For saving votes

# App URL (for API callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Example Test Flow

1. **User**: Alice connects wallet
2. **System**: Loads username from database
3. **User**: Clicks "Generate Test Task"
4. **AI**: Creates task "Build a Ronin wallet tutorial"
5. **User**: Enters URL: `https://medium.com/@alice/ronin-tutorial`
6. **User**: Clicks "Submit to Council"
7. **System**: Creates project in database
8. **System**: Triggers 3 parallel judge evaluations
9. **VALIDATOR-PRIME**: ✅ APPROVE - "Well-structured tutorial. Clear instructions."
10. **CHAOS-ARBITER**: ✅ APPROVE - "Love the energy! Great memes included."
11. **IMPACT-SAGE**: ❌ REJECT - "Too basic. Doesn't address advanced users."
12. **System**: Verdict: APPROVED (2/3 votes)
13. **User**: Sees results with all judge reasoning

## Differences from Production

| Aspect | Test Mode | Production |
|--------|-----------|------------|
| Job Source | AI-generated | On-chain smart contract |
| Payment | Simulated | Real blockchain transaction |
| Job Assignment | Any user can test | Contract-assigned worker |
| Persistence | Database only | Database + blockchain |
| Council Trigger | Manual submission | Automatic on submission |

## Use Cases

- **Development**: Test council logic without deploying contracts
- **Demo**: Show council evaluation to investors/users
- **Debugging**: Diagnose council vote issues
- **AI Tuning**: Experiment with judge personalities
- **UX Testing**: Validate submission flow before production

## Future Enhancements

- [ ] Add manual judge personality editing
- [ ] Support file uploads (images, videos)
- [ ] Show judge deliberation logs (multi-agent communication)
- [ ] Add "challenge verdict" feature
- [ ] Export council report as PDF
- [ ] A/B test different AI models for each judge role
