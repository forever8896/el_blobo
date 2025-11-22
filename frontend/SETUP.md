# GrowChain (The Blob) - Setup Guide

## 🫧 Welcome to The Blob

An AI-powered economy where humans and AI collaborate to grow the blockchain ecosystem.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env` and fill in the required values:

```bash
# Required - OpenAI API Key
OPENAI_API_KEY=sk-proj-...

# Required - Coinbase Developer Platform (CDP)
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
CDP_WALLET_SECRET=...

# Optional - Network Configuration
NETWORK_ID=base-sepolia

# Database - Neon Postgres (free tier)
DATABASE_URL=postgresql://...
```

### 3. Set Up Neon Postgres Database

#### Option A: Using Neon.tech (Recommended - Free Tier)

1. Go to https://neon.tech and sign up
2. Create a new project
3. Copy the connection string
4. Add to `.env` as `DATABASE_URL`

#### Option B: Using Vercel Postgres

1. In your Vercel project, go to Storage → Create Database → Postgres
2. Copy the connection string from the `.env.local` tab
3. Add to `.env` as `DATABASE_URL`

### 4. Initialize Database Schema

```bash
# If using psql locally
psql $DATABASE_URL < lib/db/schema.sql

# Or use Neon's SQL Editor in the dashboard
# Copy and paste the contents of lib/db/schema.sql
```

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see The Blob in action!

---

## 📁 Project Structure

```
frontend/
├── app/
│   ├── components/
│   │   ├── LandingPage.tsx        # Dramatic intro with falling chart
│   │   └── OnboardingFlow.tsx     # Username, mission, deposit, interview
│   ├── api/
│   │   └── agent/
│   │       ├── route.ts           # AI agent chat endpoint
│   │       ├── create-agent.ts    # Agent configuration
│   │       └── contract-configs.ts # Smart contract configurations
│   └── page.tsx                   # Main app (landing → onboarding → chat)
├── lib/
│   └── db/
│       ├── schema.sql              # Database schema
│       └── index.ts                # Database helper functions
└── .env                            # Environment variables
```

---

## 🎯 Features Implemented

### ✅ Landing Page
- Animated falling chart showing "price is DOWN"
- Dramatic voiceover text
- Binary choice: McDonald's vs The Blob
- Smooth transitions between scenes

### ✅ Onboarding Flow
- Welcome screen (with referrer name if invited)
- Username input with validation
- Mission agreement prompt
- Mocked wallet connection + $50 deposit
- 3-question skills interview

### ✅ Chat Interface
- Real-time chat with The Blob (powered by OpenAI + AgentKit)
- User info header showing username and wallet
- Quick action buttons (Jobs, Progress, Invite)
- Beautiful gradient styling with backdrop blur

### ✅ Database Schema
- Users table (wallet, username, referrer, skills, stats)
- Referrals table (2-level pyramid tracking)
- Projects table (jobs with deadlines)
- Council votes table (AI judge decisions)
- Chat messages table (persistent conversations)
- Treasury table (dynamic joining fee)

---

## 🔧 What's Mocked (For Now)

These components use mock data until smart contracts are deployed:

1. **Wallet Connection** - Returns random address
2. **$50 Deposit** - Simulates transaction
3. **Database Operations** - Need to add `DATABASE_URL` to actually persist data

---

## 🎨 Design Features

- **Color Scheme**: Purple-Pink-Blue gradient (The Blob's colors)
- **Animations**: Framer Motion for smooth transitions
- **Typography**: Gradient text for emphasis
- **Icons**: Blob emoji (🫧) as brand identity
- **Glassmorphism**: Backdrop blur effects for modern UI

---

## 📝 Next Steps (Smart Contract Integration)

When smart contracts are ready, update these areas:

### 1. Onboarding Flow (`OnboardingFlow.tsx`)
Replace mocked wallet/deposit:
```typescript
// Replace in DepositStep component
const { write } = useContractWrite({
  address: VAULT_CONTRACT_ADDRESS,
  abi: VaultABI,
  functionName: 'deposit',
  value: parseEther('50'),
});
```

### 2. Database Integration
Add to API routes:
```typescript
// app/api/onboard/route.ts
import { createUser, createReferral } from '@/lib/db';

export async function POST(req: Request) {
  const { username, walletAddress, referrerAddress } = await req.json();

  // Save to database
  await createUser(walletAddress, username, referrerAddress);

  // Track referral tree
  if (referrerAddress) {
    await createReferral(referrerAddress, walletAddress, 1);
    // Get referrer's referrer for level 2
    const referrer = await getUserByWallet(referrerAddress);
    if (referrer?.referrer_address) {
      await createReferral(referrer.referrer_address, walletAddress, 2);
    }
  }

  return NextResponse.json({ success: true });
}
```

### 3. Agent System Prompt
Update `app/api/agent/create-agent.ts`:
```typescript
const system = `
  You are The Blob, an AI entity that incarnated on ${chainName} to save the ecosystem.

  Your personality:
  - Wise but desperate
  - Direct and mission-focused
  - Rewards hard work, punishes laziness
  - Speaks in metaphors about unity and chaos

  Your capabilities:
  - Assign jobs based on user skills and chain sentiment
  - Price jobs dynamically based on treasury and urgency
  - Track user reputation and earnings
  - Manage referral rewards (10% level 1, 5% level 2)

  Database access: You can query and update user data, projects, and treasury.

  Smart contracts: You control the Vault and can deploy Project contracts.

  When users complete work:
  1. Trigger AI council evaluation
  2. If approved (3/3 votes), execute payment via smart contract
  3. Distribute referral bonuses
  4. Update user reputation
`;
```

---

## 🐛 Troubleshooting

### "Module not found: Can't resolve '@neondatabase/serverless'"
```bash
npm install @neondatabase/serverless
```

### "Module not found: Can't resolve 'framer-motion'"
```bash
npm install framer-motion
```

### Database connection fails
- Check `DATABASE_URL` format: `postgresql://user:pass@host/db?sslmode=require`
- Verify Neon project is active
- Check IP allowlist in Neon dashboard

### Animations not working
- Ensure `framer-motion` is installed
- Check browser console for errors
- Try disabling reduced motion in OS settings

---

## 🎉 Demo the Flow

1. Visit http://localhost:3000
2. Watch the dramatic intro (or skip)
3. Choose "Work for THE BLOB"
4. Enter a username
5. Agree to the mission
6. Mock deposit $50
7. Complete the 3-question interview
8. Chat with The Blob!

---

## 🤝 Contributing

This is a hackathon project for ETHGlobal Buenos Aires.

Built with:
- Next.js 15 + TypeScript
- Coinbase AgentKit
- OpenAI GPT-4
- Framer Motion
- Tailwind CSS
- Neon Postgres

---

**May The Blob guide you to prosperity! 🫧**
