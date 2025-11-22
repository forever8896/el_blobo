// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ProjectRegistry } from "./ProjectRegistry.sol";
import { ProjectData } from "./ProjectData.sol";
import { CallConfirmation4of4 } from "./CallConfirmation4of4.sol";
import { IRewardVault } from "./IRewardVault.sol";
import { Users } from "./Users.sol";

/// @title Main
/// @notice Glue contract that holds references to the ProjectRegistry, a RewardVault,
///         the Users registry, and per-project 4-of-4 multisigs stored in ProjectRegistry.
contract Main {
    /// @notice Project registry holding ProjectData + multisig instances
    ProjectRegistry public immutable projectRegistry;

    /// @notice Reward vault holding the funds / tokens
    IRewardVault public immutable vault;

    /// @notice Users registry (tracks user contracts + sponsors)
    Users public immutable users;

    /// @notice Owner (can create projects, update prices, etc.)
    address public owner;

    /// @notice Emitted when a user registers via Main
    event UserRegistered(address indexed user);

    /// @notice Per-project recorded reward (in vault **share units**, not assets)
    mapping(address => uint256) public projectReward;

    /// @notice Whether a project has already been finalized
    mapping(address => bool) public projectFinalized;

    // ------------------------------------------------------------------------
    // Constructor & ownership
    // ------------------------------------------------------------------------

    /// @notice Initialize Main with already-deployed registry, vault and users registry
    /// @param _projectRegistry Already-deployed ProjectRegistry
    /// @param _vault           Already-deployed RewardVault (IRewardVault)
    /// @param _users           Already-deployed Users registry
    constructor(
        ProjectRegistry _projectRegistry,
        IRewardVault _vault,
        Users _users
    ) {
        require(address(_projectRegistry) != address(0), "registry = zero");
        require(address(_vault) != address(0), "vault = zero");
        require(address(_users) != address(0), "users = zero");

        projectRegistry = _projectRegistry;
        vault = _vault;
        users = _users;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    /// @notice Transfer ownership to a new owner (single-step)
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "new owner = zero");
        owner = newOwner;
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    /// @dev Derive a unique callId per project key for payout / finalization
    function _projectCallId(address key) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("PROJECT_PAYOUT", key));
    }

    /// @dev Convenience helper to get (ProjectData, multisig) and sanity-check
    function _getProjectInfoOrRevert(address key)
        internal
        view
        returns (ProjectData pd, CallConfirmation4of4 ms)
    {
        (pd, ms) = projectRegistry.getProjectInfo(key);
        require(address(pd) != address(0), "project not found");
        require(address(ms) != address(0), "multisig not set for project");
    }

    // ------------------------------------------------------------------------
    // Registration (via Users registry)
    // ------------------------------------------------------------------------

    /// @notice Register a user in the Users registry, charging a fee based on vault price.
    ///
    /// @dev
    /// - `userAddress` is explicit but must equal msg.sender (self-registration).
    /// - Uses `vault.registrationPrice()` as a minimum fee.
    /// - Actual registration & sponsor invariants are handled by `Users.register`.
    ///
    /// @param userAddress  Address of the user being registered
    /// @param bigSponsor   Big sponsor address (or address(0) for none)
    /// @param smallSponsor Small sponsor address (or address(0) for none)
    function registerUser(
        address userAddress,
        address bigSponsor,
        address smallSponsor
    ) external payable {
        require(userAddress != address(0), "user = zero");
        require(userAddress == msg.sender, "can only self-register");

        // Enforce a minimum registration fee based on vault pricing
        uint256 price = vault.registrationPrice();
        require(msg.value >= price, "fee below registration price");

        // Delegate actual user creation & invariants to Users registry
        users.register(bigSponsor, smallSponsor);

        emit UserRegistered(userAddress);

        // Forward fee to owner (could also be left in contract if you prefer)
        (bool ok, ) = payable(owner).call{value: msg.value}("");
        require(ok, "fee transfer failed");
    }

    /// @notice Check if a given address is registered (proxy to Users)
    function isRegistered(address userAddr) external view returns (bool) {
        return users.isUser(userAddr);
    }

    // ------------------------------------------------------------------------
    // Project lifecycle
    // ------------------------------------------------------------------------

    /// @notice Create a new ProjectData via the ProjectRegistry and wire its multisig
    /// @dev Only the Main owner can create projects (matches ProjectRegistry.onlyOwner).
    ///
    /// @param key           Project key (used in registry)
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
        // create ProjectData in registry
        projectRegistry.createProject(
            key,
            assignee,
            beginDeadline,
            endDeadline,
            dbId,
            totalReward
        );

        // and wire its multisig
        projectRegistry.setProjectMultisig(key, ms);
    }

    /// @notice Sign a project payout as one of the 4 participants (assignee or committee)
    /// @dev Uses the per-project CallConfirmation4of4:
    ///      - Call will revert if msg.sender is not part of assignee/committee or already signed.
    ///      - If after this call all 4 have signed, we automatically finalize the project.
    /// @param key The project key (same key used in ProjectRegistry)
    function signProject(address key) external {
        ( , CallConfirmation4of4 ms) = _getProjectInfoOrRevert(key);
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
        ( , CallConfirmation4of4 ms) = _getProjectInfoOrRevert(key);
        bytes32 callId = _projectCallId(key);
        require(ms.isConfirmed(callId), "not fully signed");
        require(!projectFinalized[key], "already finalized");

        _finalizeProject(key);
    }

    /// @dev Internal finalization logic:
    ///      - Ensure project exists in registry
    ///      - Evaluate reward (in asset units)
    ///      - Convert to shares using RewardVault pricing
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
        (ProjectData projectData, CallConfirmation4of4 ms) =
            projectRegistry.getProjectInfo(key);

        require(address(projectData) != address(0), "project not found");
        require(address(ms) != address(0), "multisig not set for project");

        bytes32 callId = _projectCallId(key);
        require(
            ms.isConfirmed(callId),
            "payout not fully approved by multisig"
        );

        return projectData.evaluatePayment(atTime);
    }
}
