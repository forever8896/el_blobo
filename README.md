# el_blobo – Project Vault & Rewards

Smart-contract system for funding AI-judged projects via a programmable vault.

This repo contains a composable set of Solidity contracts that model:

- **Projects** with a *linear, time-based payout curve* (full reward early, decaying to 0 at the final deadline).
- **A reward vault** based on **ERC4626**, where:
  - A single `vaultOwner` actually holds the vault shares,
  - Users only hold *internal share entitlements*,
  - Rewards are paid out in the underlying ERC-20 asset.
- **A project registry** keyed by address.
- **A simple 4-of-4 multi-participant approval contract** (assignee + AI council).
- A **Main** orchestrator that ties the registry, vault, and multisigs into a full reward flow.

This README focuses on the **smart contract structure** and the **vault design**.

---

## 1. Contracts Overview

All core contracts live under:

```text
contracts/
  ├── CallConfirmation4of4.sol
  ├── ProjectData.sol
  ├── ProjectRegistry.sol
  ├── RewardVault.sol
  └── Main.sol
```

### 1.1 `RewardVault.sol`

**Purpose:**  
Tokenized reward vault for project funding, built on top of **ERC4626**. It decouples:

- **Who actually holds ERC4626 shares** (`vaultOwner`), from  
- **Who is economically entitled to rewards** (`userShares` mapping).

**Key properties:**

- Inherits:
  - `ERC20` – vault share token (name: `"RewardVault <ASSET_NAME>"`, symbol: `"rv<ASSET_SYMBOL>"`),
  - `ERC4626` – standard vault interface for an underlying ERC-20 asset.
- Uses a **fixed price model** per *share unit*:
  - `SHARE_UNIT = 1 gwei` (1e9 units of the share token),
  - `registrationPrice` = asset units per `SHARE_UNIT` of shares,
  - `convertToShares` / `convertToAssets` override the ERC4626 math to use this fixed price.

**Core storage layout:**

```solidity
uint256 public constant SHARE_UNIT = 1 gwei;

address public immutable vaultOwner;   // holds all ERC4626 shares
address public immutable owner;        // can update registrationPrice

uint256 public registrationPrice;      // asset per SHARE_UNIT

mapping(address => uint256) public userShares;  // internal entitlements
uint256 public totalAllocatedShares;            // sum of all userShares
uint256 public unallocatedShares;              // minted but not yet allocated
```

**Deposit flow:**

- `deposit(uint256 assets)`:
  - Caller must approve the vault to pull `assets` of the underlying token.
  - Vault mints **all ERC4626 shares to `vaultOwner`**.
  - Newly minted shares are counted as `unallocatedShares`.
  - A price check enforces that the number of minted shares matches the fixed-price calculation (`convertToShares`).

**Allocation flow (owner → users):**

- `transferShares(uint256 shares, address receiver)`:
  - Callable only by `vaultOwner`.
  - Decreases `unallocatedShares`.
  - Increases `totalAllocatedShares`.
  - Increases `userShares[receiver]`.
  - No ERC20 transfers happen here; it's pure **internal reward accounting**.

**User withdrawal flow:**

- `withdraw(uint256 shares, address receiver)`:
  - Callable by a user who has at least `shares` in `userShares[msg.sender]`.
  - Decrements `userShares[msg.sender]` and `totalAllocatedShares`.
  - Calls `redeem(shares, receiver, vaultOwner)` from ERC4626:
    - Burns shares from `vaultOwner`,
    - Sends the underlying asset tokens to `receiver`.

**Price control:**

- `setRegistrationPrice(uint256 newPrice)` (owner-only):
  - Updates the economic price per `SHARE_UNIT`.
  - Affects how many vault shares you get for a given asset amount (and vice versa).

This design lets the protocol or organizer concentrate **real ERC4626 ownership** in one address, while distributing **virtual reward claims** via `userShares`.

---

### 1.2 `ProjectData.sol`

**Purpose:**  
Encapsulates on-chain data for a **single project** and defines how much reward it should receive based on time and status.

**Core structure:**

```solidity
enum Status {
    WIP,   // Work in progress
    Done   // Completed – reward evaluation returns 0
}

struct Project {
    address assignee;      // person/team responsible for the project
    address[3] committee;  // AI council / committee
    uint64 createdAt;      // when project was created
    uint64 beginDeadline;  // time where reward is 100%
    uint64 endDeadline;    // time where reward decays to 0
    uint256 totalReward;   // maximum payout amount
    uint256 dbId;          // off-chain database id (metadata, links, etc.)
    Status status;         // WIP / Done
}
```

**Linear, time-based reward curve:**

`evaluatePayment(uint256 atTime)` returns `paymentRequired` according to:

- If `status == Status.Done` → `0`.
- Else (`WIP`):
  - Let `t = (atTime == 0) ? block.timestamp : atTime`.
  - If `t <= beginDeadline` → full `totalReward`.
  - If `t >= endDeadline` → `0`.
  - Otherwise (between deadlines), use a **linear decay**:

    ```solidity
    uint256 duration  = endDeadline - beginDeadline;
    uint256 remaining = endDeadline - t;
    paymentRequired = (totalReward * remaining) / duration;
    ```

**Intuition:**

- Submitting early (near `beginDeadline`) yields the **maximum payout**.
- Submitting late (near `endDeadline`) smoothly reduces the payout toward **zero**, even if the project is still marked as `WIP`.
- Once administrators mark the project as `Done`, further calls to `evaluatePayment` return `0`.

---

### 1.3 `ProjectRegistry.sol`

**Purpose:**  
Maintains a mapping from an **address key** (e.g. assignee or dedicated project key) to a **deployed `ProjectData` instance**.

**Structure:**

```solidity
struct RegisteredProject {
    ProjectData projectData;
}

address public immutable owner;
mapping(address => RegisteredProject) public projects;
```

**Responsibilities:**

- Deploy new `ProjectData` contracts with:
  - `assignee`, `committee`,
  - `beginDeadline`, `endDeadline`,
  - `totalReward`, `dbId`.
- Store them under a key in `projects[key].projectData`.
- Provide a helper `getProject(address key) returns (ProjectData)` to retrieve them.

The registry acts as a **canonical index** for all projects in the system.

---

### 1.4 `CallConfirmation4of4.sol`

**Purpose:**  
Implements a lightweight **4-of-4 multi-participant confirmation** mechanism, used to gate actions like payouts and finalization.

**Participants:**

- `assignee` (the project owner),
- `committee0`, `committee1`, `committee2` (AI council / judging members).

**Core logic:**

```solidity
mapping(bytes32 => mapping(address => bool)) public approved;
mapping(bytes32 => uint256) public approvalCount;

function approve(bytes32 callId) external onlyParticipant {
    require(!approved[callId][msg.sender], "already approved");

    approved[callId][msg.sender] = true;
    uint256 newCount = approvalCount[callId] + 1;
    approvalCount[callId] = newCount;

    emit Approved(callId, msg.sender, newCount);
}

function isConfirmed(bytes32 callId) external view returns (bool) {
    return approvalCount[callId] == 4;
}
```

A **`callId`** is an arbitrary `bytes32` identifier, typically derived from project key + action (e.g. `keccak256("PROJECT_PAYOUT", key)`). An action proceeds only if **all 4 participants** have approved that `callId`.

---

### 1.5 `Main.sol`

**Purpose:**  
Central orchestrator that wires together:

- The **ProjectRegistry** (for `ProjectData`),
- The **RewardVault** (for funding & withdrawals),
- Per-project **CallConfirmation4of4** instances (for approvals),
- User registration logic.

**Key storage:**

```solidity
ProjectRegistry public immutable projectRegistry;
IVault          public immutable vault;
address         public immutable owner;

mapping(address => CallConfirmation4of4) public projectMultisig;
mapping(address => bool) private registeredUsers;

mapping(address => uint256) public projectReward;
mapping(address => bool)    public projectFinalized;
```

**High-level responsibilities:**

1. **User registration:**
   - `register()` lets users deposit into the vault and receive vault shares (details depend on the underlying vault implementation).

2. **Project creation (via registry):**
   - `Main` does *not* deploy `ProjectData` directly in the latest design – this is done via `ProjectRegistry`.  
   - `Main` expects a `projectMultisig` to be registered per project using `registerProjectMultisig(key, ms)`.

3. **Approvals:**
   - `signProject(key)` calls `projectMultisig[key].approve(callId)` with a derived `callId`.
   - Once the multisig reports `isConfirmed(callId) == true` and the project is not yet finalized, `Main` can finalize the project and compute its reward.

4. **Finalization & reward recording:**
   - `finalizeProject(key)`:
     - Ensures `projectMultisig[key].isConfirmed(callId)`,
     - Reads the `ProjectData` via `projectRegistry.getProject(key)`,
     - Calls `evaluatePayment(block.timestamp)` to compute the reward,
     - Stores the result in `projectReward[key]`,
     - Marks `projectFinalized[key] = true`,
     - Calls `projectData.setStatus(Status.Done)`.

5. **Reward withdrawal:**
   - `withdrawProjectReward(key, assignee)`:
     - Requires the project to be finalized,
     - Requires `msg.sender == assignee`,
     - Clears `projectReward[key]`,
     - Calls `vault.withdraw(amount, assignee, address(this))` to send the underlying asset to the assignee.

`Main` is the place where **project status**, **time-based payout curve**, **multisig approval**, and **vault-backed rewards** all come together.

---

## 2. Vault Design in Detail

### 2.1 Ownership vs. Entitlement

- **Vault shares (ERC4626)** are held exclusively by `vaultOwner`.
- **User reward claims** are tracked in `userShares[address]` and are not ERC20 balances.

This has a few benefits:

- The protocol (or council) can manage vault liquidity centrally.
- Users cannot accidentally transfer their reward entitlements as ERC20 tokens.
- All user-facing reward operations go through well-defined functions (`transferShares`, `withdraw`).

### 2.2 Fixed Price Model

The vault uses a simple fixed-price model around a base *share unit*:

- `SHARE_UNIT = 1 gwei`,
- `registrationPrice` = how many units of the underlying asset you pay for `1 SHARE_UNIT`.

Conversions:

```solidity
// Assets → Shares
shares = (assets / registrationPrice) * SHARE_UNIT;

// Shares → Assets
assets = (shares * registrationPrice) / SHARE_UNIT;
```

This makes **pricing predictable** and decoupled from the instantaneous `totalAssets()` / `totalSupply()` ratio used in standard ERC4626.

### 2.3 Reward Flow with the Vault

1. Organizer funds the vault by calling `deposit(assets)`.
2. Vault mints shares to `vaultOwner`, and increments `unallocatedShares`.
3. Once a project finishes and is approved via multisig:
   - `Main` computes the project reward (`evaluatePayment`) and can:
     - either directly withdraw from the vault to the assignee, or
     - allocate internal shares via `transferShares`.
4. The assignee withdraws by burning their internal `userShares` and receiving underlying tokens via `redeem` from the vault.

---

## 3. Development & Testing (Solidity)

The repository is set up to use **Foundry** for Solidity development.

Typical workflow:

```bash
# Install dependencies (if any submodules / libs are used)
forge install

# Build contracts
forge build

# Run all tests
forge test

# Run tests with detailed traces
forge test -vvvv
```

Tests in `test/` (e.g. for `RewardVault` and `CallConfirmation4of4`) cover:

- Price conversion,
- Deposits & unallocated share accounting,
- Owner-only price updates,
- Share allocation to users,
- Withdrawals and their impact on vault balances,
- 4-of-4 approval flows and edge cases.

---
