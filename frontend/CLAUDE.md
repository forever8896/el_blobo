# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**THE BLOB** - An autonomous AI entity incarnated on Ronin blockchain. This Next.js 16 application combines Web3 wallet integration, AI agents with on-chain actions, and a multi-LLM evaluation system ("AI Council") for work submissions.

## Development Commands

```bash
# Development
npm run dev          # Start Next.js dev server on localhost:3000

# Build & Production
npm run build        # Production build
npm start            # Run production server

# Code Quality
npm run lint         # Run ESLint

# Post-install
npm run postinstall  # Apply patches (runs automatically after npm install)
```

## Architecture

### Tech Stack Overview

- **Framework**: Next.js 16.0.3 with App Router, React 19, TypeScript
- **Blockchain**: Viem + Wagmi for Ronin Saigon Testnet (chainId: 2021)
- **Wallet**: Sky Mavis Tanto Widget (`@sky-mavis/tanto-widget`)
- **AI/LLM**: Vercel AI SDK v5 with multiple providers (Grok 4.1, GPT-4o-mini, Gemini, Claude)
- **Agent Framework**: Coinbase AgentKit + LangChain for on-chain actions
- **Database**: Vercel Postgres (NeonDB) via `pg` client
- **Styling**: Tailwind CSS with custom Ronin/Blob color palette
- **Animation**: GSAP (landing page), Framer Motion (page transitions), Three.js (3D blob)

### Key Contracts (Ronin Saigon Testnet)

All contract addresses and ABIs are in `/app/config/contracts.ts` and `/app/abis/`:

- **Main** (0x46F59fF2F2ea9A2f5184B63c947346cF7171F1C3): User registration, project management
- **NativeRewardVault** (0x559d4a81e50df2141Fa5Fa6e61BA1207F139a7A7): Treasury, reward distribution
- **Users** (0x78515E569aE95e861a26e49F75B21d08E582cF16): User contract storage
- **ProjectRegistry** (0xa972eC8D5A508E73237e96E13c2fCe2B9b4c07C1): Project tracking

### Critical Architectural Patterns

#### 1. Multi-Step Onboarding Flow

Uses React Context (`/app/onboarding/context.tsx`) to manage state across 5 steps:
1. Identity (username)
2. Mission (agreement)
3. Interview (skills questionnaire)
4. Deposit (on-chain registration payment)
5. Welcome (confirmation)

Access via `useOnboarding()` hook. State persists: username, walletAddress, referrerAddress, agreedToMission, depositCompleted, interviewResponses.

#### 2. AI Agent with On-Chain Actions

**Agent Creation** (`/app/api/agent/create-agent.ts`):
- Primary model: Grok 4.1 Fast (if `GROK_API_KEY` available) for best tool calling + X search
- Fallback: GPT-4o-mini (safer option)
- Custom action providers for Blob-specific operations:
  - `blobRegistrationActionProvider`: Register users on-chain
  - `blobProjectActionProvider`: Create projects with smart contracts
  - `smartContractActionProvider`: Generic contract interaction

**Treasury Context Injection**:
- On EVERY agent request, treasury data is fetched fresh from on-chain
- Budget recommendations calculated based on treasury health (20% reserve, 15% max per project)
- Injected into system prompt to constrain agent spending

**Hook Usage** (`/app/hooks/useAgent.ts`):
- Manages conversation state, loads chat history from DB
- Sends messages to `/api/agent`, receives streamed responses
- Auto-generates greeting for new users

#### 3. AI Council Evaluation System

Located in `/app/lib/council/`:
- **Multi-LLM Voting**: Uses OpenAI, Grok, Gemini as specialized judges
- **Security Layer** (`security.ts`): Prompt injection protection with tainted data tracking
- **Content Extraction**: Pulls code from GitHub, videos from YouTube, tweets from X
- **Orchestrator Pattern** (`CouncilOrchestrator`): Manages workflow across judges

When work is submitted (`/app/api/council/evaluate/route.ts`):
1. Content extracted from submission URL
2. Each judge evaluates based on specialization
3. Votes aggregated with consensus calculation
4. Results stored in `council_votes` table

#### 4. Smart Contract Interaction Pattern

**Reading On-Chain Data** (`/app/lib/contractUtils.ts`):
```typescript
import { publicClient } from '@/app/lib/viem';
const data = await publicClient.readContract({
  address: DEPLOYED_CONTRACTS.main,
  abi: MainABI,
  functionName: 'getRegistrationPrice',
  args: []
});
```

**Writing Contracts** (via Wagmi hooks):
```typescript
import { useWriteContract } from 'wagmi';
const { writeContractAsync } = useWriteContract();
await writeContractAsync({
  address: DEPLOYED_CONTRACTS.main,
  abi: MainABI,
  functionName: 'registerUser',
  args: [userAddress, bigSponsor, smallSponsor],
  value: registrationPrice,
  gas: BigInt(500000),
  maxFeePerGas: BigInt(22000000000),
});
```

#### 5. Database Access Pattern

Custom SQL template literal function (`/app/lib/db-neon.ts`):
```typescript
import { sql } from '@/app/lib/db-neon';
const result = await sql<User[]>`
  SELECT * FROM users WHERE wallet_address = ${address}
`;
```

**Schema Tables**:
- `users`: wallet_address, username, registration_tx_hash, etc.
- `projects`: title, description, budget, status, creator_address
- `council_votes`: submission_id, judge_name, vote, reasoning
- `chat_messages`: role, content, wallet_address, timestamp
- `referrals`: referrer_address, referee_address
- `admin_suggestions`: content, created_at

#### 6. Three.js SSR Avoidance

The landing page blob (`/app/page.tsx`) uses Three.js, which requires client-side rendering:
```typescript
const TheBlob = dynamic(() => import('./components/TheBlob'), { ssr: false });
```

GSAP timeline choreography controls complex sequential animations. Multiple refs track DOM elements for animation targets.

#### 7. Singleton Pattern for Providers

In `/app/providers.tsx`, Wagmi config and React Query client use singletons to prevent recreation during Hot Module Replacement:
```typescript
let globalConfig: ReturnType<typeof getDefaultConfig> | undefined;
let globalQueryClient: QueryClient | undefined;
```

### Design System

**Color Palette** (defined in `tailwind.config.ts`):
- `blob-cobalt`: #1E4CDD (primary blue)
- `blob-mint`: #4FFFB0 (accent green)
- `blob-peach`: #FFDAB9 (secondary text)
- `blob-violet`: #240B4D (background)
- `blob-orange`: #FF9F1C (warnings/errors)
- `blob-green`: #2ECC71 (success)

**Typography**:
- Headings: Syne sans-serif (font-display, weight 800)
- Body: IBM Plex Mono (creates terminal/system aesthetic)
- Use `font-black font-mono` for consistency with landing page buttons
- Add `text-balance` to all multi-line text for better readability

**Visual Patterns**:
- Skeuomorphic shadows: `shadow-[6px_6px_0px_#4FFFB0]` creates 3D effect
- Hover states: `-translate-y-1` with shadow
- Terminal/hacker aesthetic with monospace fonts, bright colors on dark backgrounds

### User Flows

**Landing → Onboarding → Dashboard**:
1. User lands on animated landing page (`/`)
2. Chooses "Grow Ronin" path (`/start/choice`)
3. Completes 5-step onboarding (`/onboarding/*`)
4. Redirected to dashboard (`/dashboard`) with wallet connected
5. Chat history restored if existing user

**Agent Conversation → Project Creation**:
1. User messages AI agent in dashboard
2. Agent fetches real-time treasury + Twitter insights (if Grok enabled)
3. Agent proposes project ideas based on skills + Ronin ecosystem needs
4. User confirms project details
5. Agent calls `create_project_onchain` tool
6. Project created in DB and registered on blockchain

**Project Submission → AI Council Evaluation**:
1. User submits work URL + notes (`/dashboard/submit/[jobId]`)
2. Submission stored in DB
3. AI Council evaluates using multiple LLMs
4. Results displayed with consensus (`/dashboard/council/[jobId]`)

## Environment Variables

Required:
```
OPENAI_API_KEY              # For AI agent (fallback model)
CDP_API_KEY_ID              # Coinbase AgentKit wallet
CDP_API_KEY_SECRET          # Coinbase AgentKit wallet
POSTGRES_URL                # NeonDB connection
```

Optional (enable additional features):
```
GROK_API_KEY                # Enables X search + better tool calling
GOOGLE_API_KEY              # Enables Gemini judge
ANTHROPIC_API_KEY           # Enables Claude judge
```

## Important Development Notes

### Hot Spots to Watch

1. **Treasury Safety**: Budget recommendations rely on accurate contract reads. Always test treasury calculations before deploying agent changes.

2. **AI Council Latency**: Multi-LLM voting can be slow (3+ judges × API calls). Consider caching judge responses for identical submissions.

3. **Onboarding Context**: Simple Context API may need Redux/Zustand if state becomes complex beyond current 6 fields.

4. **AgentKit Custom Actions**: Zod schema → JSON Schema conversion is manual in action providers. May break with AgentKit updates.

5. **Three.js Performance**: Blob shaders are complex. Monitor performance on lower-end devices. Always use `ssr: false` for Three.js imports.

6. **React 19 SSR**: Be careful with "use client" directives. Server components are default in App Router.

### When Adding New Smart Contract Interactions

1. Add ABI JSON to `/app/abis/`
2. Update contract addresses in `/app/config/contracts.ts`
3. Create utility functions in `/app/lib/contractUtils.ts` for reads
4. Use Wagmi hooks (`useWriteContract`) for writes from client components
5. Always set gas limits and max fees to prevent transaction failures

### When Creating New Agent Tools

1. Define Zod schema for tool parameters
2. Convert to JSON Schema using `zodToJsonSchema()` (AI SDK v5 requirement)
3. Add to custom action provider in `/app/api/agent/`
4. Register provider in `create-agent.ts`
5. Test tool calling with Grok first (best tool support)

### When Modifying UI/Styling

- Use house colors from README.md color palette
- Maintain `font-black font-mono` for headings (matches intro page style)
- Add `text-balance` to multi-line text elements
- Remove blob emoji (🫧) from page headers (recent design decision)
- Follow skeuomorphic shadow pattern: `shadow-[Npx_Npx_0px_COLOR]`

## File Structure Notes

Key directories:
- `/app/api/`: Next.js API routes (agent, council, database operations)
- `/app/components/`: Reusable UI components
- `/app/hooks/`: Custom React hooks (useAgent, useRegistration, useTreasury, useWallet)
- `/app/lib/`: Business logic, utilities, AI council system, contract utils, DB client
- `/app/config/`: Contract addresses, admin settings
- `/app/types/`: TypeScript type definitions
- `/app/abis/`: Smart contract ABIs

Main user-facing routes:
- `/`: Landing page with Three.js blob
- `/start/*`: Intro flow
- `/onboarding/*`: 5-step onboarding
- `/dashboard/*`: Main workspace (jobs, submissions, council results)
- `/admin`: Treasury display + admin controls
