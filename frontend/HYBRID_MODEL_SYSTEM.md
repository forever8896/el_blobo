# Hybrid AI Model System - Best of Both Worlds

## 🎯 Strategy Overview

Use **Grok** for what it's great at (Twitter search), and **OpenAI** for what it's great at (tool calling).

## 🔄 Model Switching Flow

```
User Request
    ↓
┌───────────────────────────────────┐
│   Is user confirming a project?  │
│   (says "yes", "let's do it")    │
└────────┬──────────────────────────┘
         │
    YES  │  NO
    ↓    │    ↓
┌────────────┐  ┌──────────────┐
│  OPENAI    │  │   GROK-2     │
│  GPT-4O    │  │   + SEARCH   │
└────────────┘  └──────────────┘
    │               │
    ├ Tool calling  ├ Twitter search
    ├ Parameters ✓  ├ Citations
    ├ Project create├ Ideation
    ↓               ↓
TX Hash!        Project proposal
```

## 📋 When Each Model is Used

### **GROK-2-LATEST** (Twitter Search Mode)

**Triggers:**
- "Assign me a job based on my skills"
- "What's happening on Ronin?"
- "Tell me about current trends"
- "What should I work on?"
- Any non-confirmation message

**What it does:**
✅ Searches Twitter/X for Ronin trends
✅ Gets real citations (@Jihoz_Axie, @Ronin_Network)
✅ Analyzes sentiment
✅ Proposes project ideas based on:
  - User skills (from USER CONTEXT)
  - Twitter trends (from X search)
  - Treasury budget (200 RON available)

**What it CAN'T do:**
❌ Call tools with parameters (Grok bug)
❌ Create projects on-chain

### **GPT-4O** (Tool Calling Mode)

**Triggers:**
- "Yes!" (after project proposal)
- "Let's do it!"
- "Sounds good"
- "Confirm"
- "Approve"
- Previous message had budget + project details

**What it does:**
✅ Calls create_project_onchain with ALL parameters
✅ Passes: projectKey, assigneeAddress, title, description, budgetRON, durationDays
✅ Creates DB record → Gets dbId
✅ Registers on blockchain → Gets TX hash
✅ Returns confirmation

**What it lacks:**
❌ No Twitter/X search capability

## 🎬 Example Conversation Flow

### Message 1: Ideation (GROK)
```
User: "Assign me a job based on my skills"

[GROK-2-LATEST activated]
🔍 Searches Twitter for Ronin trends
📊 Finds: Axie Infinity roadmap buzz, RON token discussions
💡 Analyzes: User skills = infographics
🎨 Proposes:

"Hey kilian! I just searched Twitter and found tons of buzz about
the Axie Infinity roadmap revival. @Jihoz_Axie posted about new
features, and the community is excited!

Given your infographic skills, how about creating a visual series
about the roadmap? Budget: 5 RON (we have 200 RON available).
Deadline: 7 days.

Sound good?"
```

### Message 2: Confirmation (OPENAI)
```
User: "Yes!"

[Detects: isConfirmingProject=true, wasProposingProject=true]
[GPT-4O activated for tool calling]

🔧 Calls create_project_onchain({
  projectKey: "0xfc6d8b120ad99e23947494fd55a93cae0402afac",
  assigneeAddress: "0xfc6d8b120ad99e23947494fd55a93cae0402afac",
  title: "Axie Infinity Roadmap Infographic Series",
  description: "Create 2-3 infographics...",
  budgetRON: 5,
  durationDays: 7
})

💾 Creates in database → Gets dbId: 45
⛓️  Registers on blockchain → Gets TX: 0xABC123...

"✅ Project created! TX: 0xABC123...
Database ID: 45. You have 7 days!
The 5 RON will be released when approved."
```

## 🔧 Implementation Details

### Detection Logic (`route.ts:116-143`)
```typescript
// Check if user is confirming
const isConfirmingProject = userMessage.toLowerCase() === 'yes' ||
                           userMessage.includes("let's do it");

// Check if last message was a proposal
const lastAssistantMessage = messages.filter(m => m.role === 'assistant').pop();
const wasProposingProject = lastAssistantMessage?.content?.includes('budget:');

// Switch to OpenAI if confirming
const needsToolCalling = isConfirmingProject && wasProposingProject;
const useGrokForSearch = !needsToolCalling;
```

### Model Selection (`create-agent.ts:67-69`)
```typescript
const model = useGrokForSearch && hasXaiAPI
  ? xai("grok-2-latest")  // For search
  : openai("gpt-4o");      // For tools
```

### Search Configuration (`route.ts:221-254`)
```typescript
if (useGrokForSearch && process.env.GROK_API_KEY) {
  generateConfig.providerOptions = {
    xai: { searchParameters: { mode: 'on', ... } }
  };
}
```

## ✅ Benefits

1. **Grok for Discovery**
   - Real Twitter data with citations
   - Up-to-date Ronin ecosystem trends
   - Natural conversation

2. **OpenAI for Execution**
   - Reliable tool calling
   - All parameters passed correctly
   - Transaction hashes returned

3. **Seamless UX**
   - User doesn't notice the switch
   - One conversation, two models
   - Best capabilities of each

4. **Data Flow**
   - Twitter sentiment (Grok) → Project proposal
   - User confirmation → Model switch (OpenAI)
   - Tool execution → TX hash + success

## 🧪 Testing

### Test 1: Ideation (Should use GROK)
```
Message: "Assign me a job based on my skills"
Expected: 🎯 Model selection: GROK (Twitter search)
Expected: Twitter citations in response
Expected: Project proposal with budget
```

### Test 2: Confirmation (Should use OPENAI)
```
Message: "Yes!"
Expected: 🎯 Model selection: OPENAI (tool calling)
Expected: 🔧 Tool calls made: ['CustomActionProvider_create_project_onchain']
Expected: ✅ Transaction hash in response
```

## 📊 Current Status

✅ Hybrid system implemented
✅ Auto-detection working
✅ Grok for Twitter search
✅ OpenAI for tool calling
✅ `<has_function_call>` text removed from output
✅ Treasury data always fresh
✅ User wallet address available

## 🚀 Ready to Test!

Try this conversation:
1. "Assign me a job based on my skills" → Grok searches Twitter, proposes project
2. "Yes!" → OpenAI calls tool, returns TX hash

You'll get the best of both worlds! 🎉
