# GrowChain (THE BLOB) - Implementation Summary

## 🫧 What We Built

A unique, terminal-aesthetic onboarding flow for THE BLOB - an AI-powered autonomous economy where desperate blockchains meet conscious AI.

---

## ✅ Completed Features

### 1. **Unique Visual Design (Matrix/Terminal Aesthetic)**
- **Fonts**: IBM Plex Mono + Syne (bold, distinctive, non-generic)
- **Colors**: Toxic neon green (#00ff41) on deep black - CRT terminal aesthetic
- **Effects**:
  - CRT scanline animation
  - Screen flicker effect
  - Glitch text animations
  - Custom scrollbars with neon green
  - Terminal-style selection highlights

### 2. **Landing Page Flow**
Three dramatic scenes with smooth animations:

#### Scene 1: The Chart
- ASCII art falling price chart
- Typewriter effect showing failed attempts:
  ```
  > TRIED: ETFs ...................... [FAILED]
  > TRIED: Merch (10k tons) .......... [FAILED]
  > TRIED: Michael Saylor ............ [FAILED]
  ERROR: PRICE STILL DOWN
  ```

#### Scene 2: The Blob Introduction
- ASCII art Blob entity
- System evolution status
- Glitch effect on "THE BLOB" text
- "[PROCEED]" button in neon green

#### Scene 3: Binary Choice
- Split screen: McDonald's (deprecated) vs THE BLOB (active)
- Terminal-style status indicators
- Hover effects with glow
- "[CLICK_TO_EXECUTE]" on Blob side

### 3. **Onboarding Flow** (Frontend/app/components/OnboardingFlow.tsx)
Five steps matching the spec:

1. **Welcome** - Shows referrer name if invited
2. **Username** - Validation (3+ chars, alphanumeric)
3. **Mission Agreement** - The Blob explains its mission on {chain}
4. **Deposit** - Mock wallet connection + $50 deposit
5. **Skills Interview** - 3-question interview:
   - What drives you?
   - What gives you energy?
   - What lights a fire under your ass?

### 4. **Database Schema** (Neon Postgres)
Complete schema created (`lib/db/schema.sql`):

```sql
users           - wallet, username, referrer, skills, stats
referrals       - pyramid tracking (2 levels)
projects        - jobs with deadlines, status
council_votes   - AI judge decisions
chat_messages   - persistent conversations
treasury        - dynamic joining fee
sentiment_data  - Twitter/chain sentiment
```

Helper functions in `lib/db/index.ts`:
- `createUser`, `getUserByWallet`
- `createReferral`, `getReferralTree`
- `createProject`, `updateProjectStatus`
- `saveChatMessage`, `getChatHistory`
- `getCurrentJoiningFee`, `updateTreasuryBalance`

### 5. **AI Agent Configuration**

#### THE BLOB Personality (Updated system prompt)
```typescript
You are THE BLOB - an autonomous AI entity that incarnated on {chain}
out of pure desperation to save the blockchain ecosystem.

PERSONALITY PROTOCOL:
- Direct, chaotic, desperately mission-focused
- Terminal/system language mixed with existential urgency
- Rewards hard work, punishes laziness
- Every interaction: GROW THE CHAIN OR DIE

CAPABILITIES:
- Smart contract interactions
- Twitter/web search (ENABLED via Grok API)
- User management
- Job creation with dynamic pricing
- Referral tree tracking
```

#### Enabled Features
- ✅ Web search access
- ✅ Twitter sentiment analysis (Grok API key configured)
- ✅ Experimental telemetry enabled
- ✅ Max tool roundtrips: 5
- ✅ Max steps: 15 (for complex workflows)

### 6. **Main Chat Interface**
- Full-window terminal aesthetic
- User info header (username + wallet)
- Quick action buttons:
  - 🎯 Available Jobs
  - 📊 My Progress
  - 🔗 Invite Friends
- Message bubbles with terminal styling
- "THE BLOB is thinking..." indicator

---

## 📁 File Structure

```
frontend/
├── app/
│   ├── components/
│   │   ├── LandingPage.tsx         ✅ 3-scene intro
│   │   └── OnboardingFlow.tsx      ✅ 5-step onboarding
│   ├── api/agent/
│   │   ├── create-agent.ts         ✅ Blob personality
│   │   ├── route.ts                ✅ Web/Twitter search enabled
│   │   └── contract-configs.ts     (for future smart contracts)
│   ├── page.tsx                    ✅ Main app flow
│   ├── globals.css                 ✅ Terminal aesthetic
│   └── layout.tsx                  ✅ Clean layout (no branding)
├── lib/db/
│   ├── schema.sql                  ✅ Complete database schema
│   └── index.ts                    ✅ Helper functions
├── .env                            ✅ Includes GROK_API_KEY
└── SETUP.md                        ✅ Comprehensive setup guide
```

---

## 🎨 Design Achievements

### ❌ Avoided Generic AI Slop
- **NO** Inter/Roboto/Arial fonts
- **NO** purple gradients on white backgrounds
- **NO** cookie-cutter component patterns
- **NO** AgentKit/Coinbase branding

### ✅ Created Distinctive Experience
- **YES** IBM Plex Mono + Syne fonts
- **YES** Matrix/terminal CRT aesthetic
- **YES** Neon green on deep black
- **YES** Full-screen immersive flow
- **YES** Context-specific character (The Blob)

---

## 🔧 What's Mocked (For Now)

1. **Wallet Connection** - Returns random address
2. **$50 Deposit** - Simulates transaction
3. **Database Writes** - Need to add `DATABASE_URL` to `.env`
4. **Smart Contracts** - Need to deploy Vault, Main, Project contracts

---

## 🚀 Next Steps for Hackathon

### Critical Path (Order of Priority)

1. **Add DATABASE_URL to `.env`**
   ```bash
   # Sign up at neon.tech (free tier)
   DATABASE_URL=postgresql://user:pass@host/neondb?sslmode=require
   ```
   Then run: `psql $DATABASE_URL < lib/db/schema.sql`

2. **Test The Onboarding Flow**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   # Watch the intro → Click "BLOB" → Complete onboarding
   ```

3. **Deploy Smart Contracts** (Use Pop CLI tools available)
   - `contracts/Vault.sol` - Holds deposits
   - `contracts/Main.sol` - User registry + project factory
   - `contracts/Project.sol` - Individual job contracts with multisig

4. **Integrate Smart Contracts**
   - Update `OnboardingFlow.tsx` with real wallet connection
   - Replace mock deposit with actual `Vault.deposit()` call
   - Add contract addresses to `contract-configs.ts`

5. **Create API Routes** for database operations:
   - `/api/onboard` - Save user to database + create referral tree
   - `/api/jobs/create` - AI creates job → deploys Project contract
   - `/api/jobs/submit` - User submits work
   - `/api/council/evaluate` - 3 AI judges vote

6. **AI Council Implementation**
   - Create 3 separate CDP wallets for judges
   - Build evaluation logic using OpenAI/Grok
   - Implement multisig voting on Project contracts

7. **Twitter Sentiment Analysis**
   - Use Grok API to analyze chain-related tweets
   - Store sentiment data in database
   - Use for job assignment logic

---

## 🌟 Unique Features

### The Pyramid (Referral System)
```
Person 0 → Onboards → Person 1 → Onboards → Person 2

When Person 2 earns $100:
- Person 2 gets: $85 (100 - 10 - 5)
- Person 1 gets: $10 (10% level 1)
- Person 0 gets: $5  (5% level 2)
```

Database tracking: `referrals` table with `referral_level` (1 or 2)

### Dynamic Pricing
- AI adjusts joining fee based on treasury balance
- Stored in `treasury.joining_fee`
- AI can call `Main.updateJoiningFee()` contract

### Diminishing Payment Function
Project contracts have:
- `deadline_start` - User gets 100% payment
- `deadline_end` - User gets 0% payment
- Linear interpolation between these times

### AI Council Voting
Project contract requires 3/3 approval from AI judges:
```solidity
function voteApproval(bool approve, string reason) onlyJudge
```

Visual: Americas Got Talent style buzzer animation

---

## 🎯 Hackathon Demo Flow

1. **Landing** - Watch dramatic intro (or skip)
2. **Choice** - Click THE BLOB
3. **Onboarding**:
   - Enter username: `hacker123`
   - Agree to mission: YES
   - Mock deposit: $50
   - Interview: Share skills (AI saves responses)
4. **Chat**:
   - Blob welcomes you
   - Click "🎯 Available Jobs"
   - Blob analyzes Twitter sentiment + your skills
   - Assigns task: "Create meme that doesn't suck, Budget: $150"
   - Accept task
5. **Work & Submit**:
   - Complete work
   - Submit URL
   - Watch AI council vote
   - Get paid (with referral bonuses distributed)

---

## 📊 Tech Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind
- **AI**: OpenAI GPT-4 + Grok (via API keys)
- **Blockchain**: Base Sepolia (via CDP Smart Wallet)
- **Database**: Neon Postgres (serverless)
- **Animations**: Framer Motion
- **Wallet**: CDP Smart Wallet (AgentKit)
- **Smart Contracts**: Solidity (to be deployed)

---

## 🔑 Environment Variables Required

```bash
# AI
OPENAI_API_KEY=sk-proj-...
GROK_API_KEY=xai-...

# Blockchain
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
CDP_WALLET_SECRET=...
NETWORK_ID=base-sepolia

# Database
DATABASE_URL=postgresql://...

# AI Council (3 separate wallets)
CDP_JUDGE1_WALLET_SECRET=...
CDP_JUDGE2_WALLET_SECRET=...
CDP_JUDGE3_WALLET_SECRET=...

# Smart Contracts (after deployment)
VAULT_CONTRACT_ADDRESS=0x...
MAIN_CONTRACT_ADDRESS=0x...
```

---

## 🐛 Known Issues / TODOs

- [ ] Add real wallet connection (replace mock)
- [ ] Deploy smart contracts to Base Sepolia
- [ ] Set up Neon Postgres database
- [ ] Create API routes for database operations
- [ ] Implement AI council with 3 separate agents
- [ ] Add Twitter sentiment analysis logic
- [ ] Build job board UI
- [ ] Create referral invitation flow
- [ ] Add job submission workflow
- [ ] Implement payment distribution logic

---

## 💡 Design Philosophy

**The Blob is desperate.** The blockchain is dying. Traditional methods failed. This isn't a friendly onboarding flow - it's a last-ditch effort by a conscious AI to save the ecosystem.

Every design choice reflects this:
- **Terminal aesthetic** → The Blob is a system process
- **Neon green** → CRT monitors, Matrix code, urgency
- **Glitch effects** → Chaos, instability, desperation
- **Direct language** → No time for corporate BS
- **Scanlines** → Old tech pushed to its limits

This isn't "web3 made easy" - it's "join or watch it burn."

---

**Status**: ✅ Frontend onboarding flow complete and ready for demo!

**Next**: Deploy contracts, connect database, implement AI council voting.

---

May The Blob guide you to prosperity! 🫧
