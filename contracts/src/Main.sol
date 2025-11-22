// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ProjectRegistry } from "./ProjectRegistry.sol";
import { ProjectData } from "./ProjectData.sol";
import { CallConfirmation4of4 } from "./CallConfirmation4of4.sol";
import { RewardVault } from "./RewardVault.sol";

/// @title Main
/// @notice Glue contract that holds references to the ProjectRegistry, a RewardVault,
///         and per-project 4-of-4 multisigs (CallConfirmation4of4) and can use all of them.
contract Main {
    /// @notice Project registry holding ProjectData instances
    ProjectRegistry public immutable projectRegistry;

    /// @notice Reward vault holding the funds / tokens
    RewardVault public immutable vault;

    /// @notice Owner (can create projects, register project multisigs, update prices)
    address public immutable owner;

    /// @notice Per-project multisig (4-of-4) contracts
    /// @dev keyed by the same `key` used in ProjectRegistry.projects mapping
    mapping(address => CallConfirmation4of4) public projectMultisig;

    /// @notice Registered users
    mapping(address => bool) private registeredUsers;

    /// @notice Emitted when a user registers
    event UserRegistered(address indexed user);

    /// @notice Per-project recorded reward (in vault **share units**, not assets)
    mapping(address => uint256) public projectReward;

    /// @notice Whether a project has already been finalized
    mapping(address => bool) public projectFinalized;

    // ------------------------------------------------------------------------
    // Constructor & modifiers
    // ------------------------------------------------------------------------

    /// @notice Set registry and vault at deployment time
    /// @param _projectRegistry Already-deployed ProjectRegistry
    /// @param _vault           Already-deployed RewardVault (ERC4626-style)
    constructor(ProjectRegistry _projectRegistry, RewardVault _vault) {
        require(address(_projectRegistry) != address(0), "registry = zero");
        require(address(_vault) != address(0), "vault = zero");

        projectRegistry = _projectRegistry;
        vault = _vault;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    /// @dev Derive a unique callId per project key for payout / finalization
    function _projectCallId(address key) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("PROJECT_PAYOUT", key));
    }

    /// @dev Get the multisig for a project or revert if missing
    function _getMultisigOrRevert(address key)
        internal
        view
        returns (CallConfirmation4of4 ms)
    {
        ms = projectMultisig[key];
        require(address(ms) != address(0), "multisig not set for project");
    }

    // ------------------------------------------------------------------------
    // Multisig registration (per project)
    // ------------------------------------------------------------------------

    /// @notice Register a multisig instance for a given project key
    /// @dev Intended to be called by the owner after deploying a multisig
    /// @param key The project key (same key used in ProjectRegistry)
    /// @param ms  The CallConfirmation4of4 instance for this project
    function registerProjectMultisig(address key, CallConfirmation4of4 ms)
        public
        onlyOwner
    {
        require(key != address(0), "key = zero");
        require(address(ms) != address(0), "multisig = zero");
        require(address(projectMultisig[key]) == address(0), "multisig already set");

        // verify that the project exists in the registry
        ProjectData pd = projectRegistry.getProject(key);
        require(address(pd) != address(0), "project not found in registry");

        projectMultisig[key] = ms;
    }

    // ------------------------------------------------------------------------
    // Registration
    // ------------------------------------------------------------------------

    /// @notice Register the caller as a user.
    /// @dev Payable: use `vault.registrationPrice()` as a reference fee.
    ///      This does NOT interact with the vault directly; funding the vault
    ///      is done separately via RewardVault.deposit.
    function registerUser() external payable {
        require(!registeredUsers[msg.sender], "already registered");

        uint256 price = vault.registrationPrice();
        // Treat registrationPrice as a minimum fee in native units (assumes same decimals)
        require(msg.value >= price, "fee below registration price");

        registeredUsers[msg.sender] = true;
        emit UserRegistered(msg.sender);

        // Forward fee to owner (could also be left in contract if you prefer)
        (bool ok, ) = payable(owner).call{value: msg.value}("");
        require(ok, "fee transfer failed");
    }

    /// @notice Check if a given address is registered
    function isRegistered(address user) external view returns (bool) {
        return registeredUsers[user];
    }

    // ------------------------------------------------------------------------
    // Project lifecycle
    // ------------------------------------------------------------------------

    /// @notice Create a new ProjectData via the ProjectRegistry and wire its multisig
    /// @dev Only the Main owner can create projects (matches ProjectRegistry.onlyOwner).
    /// @param key           Project key (used in both registry and Main mappings)
    /// @param assignee      Project assignee
    /// @param beginDeadline Start of 100% payment window
    /// @param endDeadline   End of window (0% after this)
    /// @param dbId          Off-chain DB id
    /// @param totalReward   Max payment amount for this project (asset units)
    /// @param ms            CallConfirmation4of4 multisig for this project
    function createProject(
        address key,
        address assignee,
        uint64 beginDeadline,
        uint64 endDeadline,
        uint256 dbId,
        uint256 totalReward,
        CallConfirmation4of4 ms
    ) external onlyOwner {
        projectRegistry.createProject(
            key,
            assignee,
            beginDeadline,
            endDeadline,
            dbId,
            totalReward
        );

        registerProjectMultisig(key, ms);
    }

    /// @notice Sign a project payout as one of the 4 participants (assignee or committee)
    /// @dev Uses the per-project CallConfirmation4of4:
    ///      - Call will revert if msg.sender is not part of assignee/committee or already signed.
    ///      - If after this call all 4 have signed, we automatically finalize the project.
    /// @param key The project key (same key used in ProjectRegistry)
    function signProject(address key) external {
        CallConfirmation4of4 ms = _getMultisigOrRevert(key);
        bytes32 callId = _projectCallId(key);

        ms.approve(callId);

        // If everybody signed, finalize the project
        if (ms.isConfirmed(callId) && !projectFinalized[key]) {
            _finalizeProject(key);
        }
    }

    /// @notice External entrypoint to manually finalize a project once 4-of-4 have signed
    /// @param key The project key (same key used in ProjectRegistry)
    function finalizeProject(address key) external {
        CallConfirmation4of4 ms = _getMultisigOrRevert(key);
        bytes32 callId = _projectCallId(key);
        require(ms.isConfirmed(callId), "not fully signed");
        require(!projectFinalized[key], "already finalized");

        _finalizeProject(key);
    }

    /// @dev Internal finalization logic:
    ///      - Ensure project exists in registry
    ///      - Evaluate reward (in asset units)
    ///      - Convert to shares using vault.convertToShares
    ///      - Record project reward (in share units)
    ///      - Mark project as Done in ProjectData
    function _finalizeProject(address key) internal {
        ProjectData projectData = projectRegistry.getProject(key);

        // Evaluate reward at current time (asset units)
        uint256 assets = projectData.evaluatePayment(block.timestamp);
        require(assets > 0, "no reward to pay");

        // Convert to shares based on RewardVault pricing
        uint256 shares = vault.convertToShares(assets);
        require(shares > 0, "reward too small");

        // Ensure vault has enough unallocated shares (optional safety)
        require(vault.unallocatedShares() >= shares, "insufficient vault shares");

        // Record the reward for this project in share units
        projectReward[key] = shares;
        projectFinalized[key] = true;

        // Mark project as Done inside ProjectData
        projectData.setStatus(ProjectData.Status.Done);
    }

    /// @notice Allocate the project reward (in shares) to the assignee inside RewardVault
    /// @dev After this, the assignee can call RewardVault.withdraw(shares, receiver)
    ///      to redeem the underlying assets.
    /// @param key       The project key (same key used in ProjectRegistry)
    /// @param assignee  The assignee address that should receive the reward shares
    function withdrawProjectReward(address key, address assignee)
        external
        returns (uint256 allocatedShares)
    {
        require(assignee != address(0), "assignee = zero");
        require(projectFinalized[key], "project not finalized");

        uint256 shares = projectReward[key];
        require(shares > 0, "no reward recorded");

        // Only assignee can trigger their own share allocation
        require(msg.sender == assignee, "only assignee can claim");

        // Clear state before external call (re-entrancy safety)
        projectReward[key] = 0;

        // Allocate shares to assignee in RewardVault
        vault.transferShares(shares, assignee);

        return shares;
    }

    // ------------------------------------------------------------------------
    // Admin: update registration price via RewardVault
    // ------------------------------------------------------------------------

    /// @notice Update the registration price in the underlying RewardVault
    /// @dev Only Main.owner can call this; RewardVault itself also enforces its own owner.
    function updateRegistrationPrice(uint256 price) external onlyOwner {
        require(price > 0, "price = 0");
        vault.setRegistrationPrice(price);
    }

    // ------------------------------------------------------------------------
    // Read-only helpers
    // ------------------------------------------------------------------------

    /// @notice Helper: read how much should be paid for a given project key, at a given time
    /// @dev Requires that the payout has been fully approved by the 4-of-4 multisig
    ///      for this specific project (key). Returns amount in *asset units*,
    ///      not in shares.
    /// @param key    The address key used in ProjectRegistry.projects mapping
    /// @param atTime Timestamp used for evaluation (0 = use block.timestamp)
    function evaluatePaymentFor(address key, uint256 atTime)
        external
        view
        returns (uint256 paymentRequired)
    {
        CallConfirmation4of4 ms = projectMultisig[key];
        require(address(ms) != address(0), "multisig not set for project");

        bytes32 callId = _projectCallId(key);
        require(
            ms.isConfirmed(callId),
            "payout not fully approved by multisig"
        );

        ProjectData projectData = projectRegistry.getProject(key);
        return projectData.evaluatePayment(atTime);
    }
}
