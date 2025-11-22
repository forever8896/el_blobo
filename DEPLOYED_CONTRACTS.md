# THE BLOB - Deployed Contracts (Ronin Saigon)

**Deployment Date**: January 22, 2025
**Network**: Ronin Saigon Testnet (Chain ID: 2021)
**Explorer**: https://saigon-app.roninchain.com

---

## Contract Addresses

### Main Contract
- **Address**: `0x105BAE5259f8653F6e15252e58BEaFFA87a80F91`
- **Current Owner**: `0xC426867C776efC7680880d1441ab8dB5cbDe06B0` (Deployer)
- **Target Owner**: `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe` (Coinbase Server)
- **Explorer**: https://saigon-app.roninchain.com/address/0x105BAE5259f8653F6e15252e58BEaFFA87a80F91

### ProjectRegistry
- **Address**: `0x836d6e4E8A1a60Ae8DE0F3E9E711a0A6Ed8C2D04`
- **Current Owner**: `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe` (Coinbase Server) ✅
- **Explorer**: https://saigon-app.roninchain.com/address/0x836d6e4E8A1a60Ae8DE0F3E9E711a0A6Ed8C2D04

### NativeRewardVault
- **Address**: `0xec2F81059c1abDEA021D5fc23bB8B61C4f5F5adA`
- **Current Owner**: `0xC426867C776efC7680880d1441ab8dB5cbDe06B0` (Deployer)
- **Target Owner**: `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe` (Coinbase Server)
- **Initial Balance**: 1 RON (1000000000000000000 wei)
- **Registration Price**: 50000000 wei (0.00000005 RON)
- **Explorer**: https://saigon-app.roninchain.com/address/0xec2F81059c1abDEA021D5fc23bB8B61C4f5F5adA

---

## Contract ABIs

ABIs are saved in:
- `contracts/deployments/Main.abi.json`
- `contracts/deployments/ProjectRegistry.abi.json`
- `contracts/deployments/NativeRewardVault.abi.json`
- `contracts/deployments/CallConfirmation4of4.abi.json`

---

## Key Functions

### Main Contract

**User Functions:**
```solidity
function registerUser() external payable
function signProject(address key) external
function withdrawProjectReward(address key, address assignee) external
function isRegistered(address user) external view returns (bool)
```

**Owner Functions:**
```solidity
function createProject(address key, address assignee, uint64 beginDeadline, uint64 endDeadline, uint256 dbId, uint256 totalReward, CallConfirmation4of4 ms) external
function registerProjectMultisig(address key, CallConfirmation4of4 ms) external
function updateRegistrationPrice(uint256 price) external
function transferOwnership(address newOwner) external
```

### NativeRewardVault

**User Functions:**
```solidity
function withdraw(uint256 shares, address receiver) external returns (uint256)
function userShares(address user) external view returns (uint256)
function convertToAssets(uint256 shares) external pure returns (uint256)
```

**Owner Functions:**
```solidity
function transferShares(uint256 shares, address receiver) external
function setRegistrationPrice(uint256 newPrice) external
function transferOwnership(address newOwner) external
```

**Receive Function:**
```solidity
receive() external payable // Send RON directly to fund the vault
```

### ProjectRegistry

**Owner Functions:**
```solidity
function createProject(address key, address assignee, uint64 beginDeadline, uint64 endDeadline, uint256 dbId, uint256 totalReward) external returns (ProjectData)
function transferOwnership(address newOwner) external
```

**View Functions:**
```solidity
function getProject(address key) external view returns (ProjectData)
```

---

## Ownership Status

| Contract | Current Owner | Target Owner | Status |
|----------|---------------|--------------|--------|
| Main | `0xC426867C776efC7680880d1441ab8dB5cbDe06B0` | `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe` | ⚠️ **Needs Transfer** |
| ProjectRegistry | `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe` | `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe` | ✅ **Correct** |
| NativeRewardVault | `0xC426867C776efC7680880d1441ab8dB5cbDe06B0` | `0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe` | ⚠️ **Needs Transfer** |

---

## Transfer Ownership Commands

Transfer ownership to Coinbase server wallet:

```bash
# Set environment variables
MAIN_ADDRESS=0x105BAE5259f8653F6e15252e58BEaFFA87a80F91
VAULT_ADDRESS=0xec2F81059c1abDEA021D5fc23bB8B61C4f5F5adA
TARGET_OWNER=0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe
RPC_URL=https://saigon-testnet.roninchain.com/rpc
DEPLOYER_KEY=0x4d3071a94f7b614f06a5b12122e0b922b859d30fa92e1a691645ffd402dc686f

# Transfer Main ownership
cast send $MAIN_ADDRESS \
  "transferOwnership(address)" \
  $TARGET_OWNER \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_KEY \
  --legacy

# Transfer Vault ownership
cast send $VAULT_ADDRESS \
  "transferOwnership(address)" \
  $TARGET_OWNER \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_KEY \
  --legacy
```

Or use the deployment script:
```bash
MAIN_ADDRESS=0x105BAE5259f8653F6e15252e58BEaFFA87a80F91 \
REGISTRY_ADDRESS=0x836d6e4E8A1a60Ae8DE0F3E9E711a0A6Ed8C2D04 \
VAULT_ADDRESS=0xec2F81059c1abDEA021D5fc23bB8B61C4f5F5adA \
forge script script/TransferOwnership.s.sol:TransferOwnership \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_KEY \
  --broadcast \
  --legacy
```

---

## Verify Deployment

```bash
# Check Main owner
cast call 0x105BAE5259f8653F6e15252e58BEaFFA87a80F91 \
  "owner()(address)" \
  --rpc-url https://saigon-testnet.roninchain.com/rpc

# Check Registry owner
cast call 0x836d6e4E8A1a60Ae8DE0F3E9E711a0A6Ed8C2D04 \
  "owner()(address)" \
  --rpc-url https://saigon-testnet.roninchain.com/rpc

# Check Vault owner
cast call 0xec2F81059c1abDEA021D5fc23bB8B61C4f5F5adA \
  "owner()(address)" \
  --rpc-url https://saigon-testnet.roninchain.com/rpc

# Check Vault balance
cast call 0xec2F81059c1abDEA021D5fc23bB8B61C4f5F5adA \
  "totalAssets()(uint256)" \
  --rpc-url https://saigon-testnet.roninchain.com/rpc
```

---

## Important Notes

1. **Native RON Payments**: The NativeRewardVault uses native RON tokens, NOT ERC20 stablecoins
2. **Vault Funding**: Vault currently has 1 RON. Send more RON to fund worker payments:
   ```bash
   cast send 0xec2F81059c1abDEA021D5fc23bB8B61C4f5F5adA \
     --value 10ether \
     --rpc-url https://saigon-testnet.roninchain.com/rpc \
     --private-key $YOUR_KEY \
     --legacy
   ```
3. **Single-Step Ownership**: Ownership transfer is immediate (no acceptance required)
4. **ProjectRegistry**: Already owned by Coinbase wallet (was set during deployment)

---

## Frontend Integration

Update your frontend with these addresses:

```typescript
// frontend/lib/contracts/ronin-saigon.ts
export const RONIN_SAIGON_CONTRACTS = {
  chainId: 2021,
  rpcUrl: 'https://saigon-testnet.roninchain.com/rpc',
  contracts: {
    Main: '0x105BAE5259f8653F6e15252e58BEaFFA87a80F91',
    ProjectRegistry: '0x836d6e4E8A1a60Ae8DE0F3E9E711a0A6Ed8C2D04',
    NativeRewardVault: '0xec2F81059c1abDEA021D5fc23bB8B61C4f5F5adA',
  },
};
```

Import ABIs from:
- `contracts/deployments/*.abi.json`
