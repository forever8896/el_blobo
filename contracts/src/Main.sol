// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ProjectRegistry } from "./ProjectRegistry.sol";
import { ProjectData } from "./ProjectData.sol";
import { CallConfirmation4of4 } from "./CallConfirmation4of4.sol";

/// @dev Minimal vault interface (you can swap this to OpenZeppelin's IERC4626 later)
interface IVault {
    /// @notice Deposit underlying assets into the vault and receive shares
    /// @dev Here we assume the vault accepts ETH, so deposit is payable.
    function deposit(uint256 assets, address receiver)
        external
        payable
        returns (uint256 shares);

    function withdraw(uint256 assets, address receiver, address owner)
        external
        returns (uint256 shares);

    function totalAssets() external view returns (uint256);
}

/// @title Main
/// @notice Glue contract that holds references to the ProjectRegistry, a Vault,
///         and per-project 4-of-4 multisigs (CallConfirmation4of4) and can use all of them.
contract Main {
    /// @notice Project registry holding ProjectData instances
    ProjectRegistry public immutable projectRegistry;

    /// @notice Vault holding the funds / tokens
    IVault public immutable vault;

    /// @notice Owner (can create projects and register project multisigs)
    address public immutable owner;

    /// @notice Per-project multisig (4-of-4) contracts
    /// @dev keyed by the same `key` used in ProjectRegistry.projects mapping
    mapping(address => CallConfirmation4of4) public projectMultisig;

    /// @notice Registered users
    mapping(address => bool) private registeredUsers;

    /// @notice Emitted when a user registers
    event UserRegistered(address indexed user);

    /// @notice Per-project recorded reward (in vault asset units)
    mapping(address => uint256) public projectReward;

    /// @notice Whether a project has already been finalized
    mapping(address => bool) public projectFinalized;

    // ------------------------------------------------------------------------
    // Constructor & modifiers
    // ------------------------------------------------------------------------

    /// @notice Set registry and vault at deployment time
    /// @param _projectRegistry Already-deployed ProjectRegistry
    /// @param _vault           Already-deployed Vault (ERC4626-style)
    constructor(ProjectRegistry _projectRegistry, IVault _vault) {
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

    /// @notice Register the caller as a user and buy vault shares
    /// @dev Payable: user sends ETH, which is deposited into the vault on their behalf.
    function register() external payable {
        require(!registeredUsers[msg.sender], "already registered");
        require(msg.value > 0, "no funds sent");

        // Buy vault shares for the user
        vault.deposit{value: msg.value}(msg.value, owner);

        registeredUsers[msg.sender] = true;
        emit UserRegistered(msg.sender);
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
    /// @param committee     Committee members (3)
    /// @param beginDeadline Start of 100% payment window
    /// @param endDeadline   End of window (0% after this)
    /// @param dbId          Off-chain DB id
    /// @param totalReward   Max payment amount for this project
    /// @param ms            CallConfirmation4of4 multisig for this project
    function createProject(
        address key,
        address assignee,
        address[3] memory committee,
        uint64 beginDeadline,
        uint64 endDeadline,
        uint256 dbId,
        uint256 totalReward,
        CallConfirmation4of4 ms
    ) external onlyOwner {
        // Create the project in the registry (this call will revert if called by non-owner of registry)
        projectRegistry.createProject(
            key,
            assignee,
            committee,
            beginDeadline,
            endDeadline,
            dbId,
            totalReward
        );

        // Register the multisig for this project
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

        // Enforces "signee is either part of the committee or assignee and didn't sign yet"
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
    ///      - Evaluate reward
    ///      - Record project reward
    ///      - Mark project as Done in ProjectData
    function _finalizeProject(address key) internal {
        ProjectData projectData = projectRegistry.getProject(key);

        // Evaluate reward at current time
        uint256 amount = projectData.evaluatePayment(block.timestamp);
        require(amount > 0, "no reward to pay");

        // Record the reward for this project
        projectReward[key] = amount;
        projectFinalized[key] = true;

        // Mark project as Done inside ProjectData
        projectData.setStatus(ProjectData.Status.Done);
    }

    /// @notice Withdraw the project reward from the vault to the assignee
    /// @dev We assume the vault holds enough assets and that Main owns the
    ///      corresponding shares so it can withdraw `amount` to the assignee.
    /// @param key       The project key (same key used in ProjectRegistry)
    /// @param assignee  The assignee address that should receive the reward
    function withdrawProjectReward(address key, address assignee)
        external
        returns (uint256 withdrawn)
    {
        require(assignee != address(0), "assignee = zero");
        require(projectFinalized[key], "project not finalized");

        uint256 amount = projectReward[key];
        require(amount > 0, "no reward recorded");

        // Only assignee can trigger their own withdrawal
        require(msg.sender == assignee, "only assignee can withdraw");

        // Clear state before external call (re-entrancy safety)
        projectReward[key] = 0;

        // Withdraw underlying assets to the assignee
        withdrawn = vault.withdraw(amount, assignee, address(this));
    }

    // ------------------------------------------------------------------------
    // Read-only helpers
    // ------------------------------------------------------------------------

    /// @notice Helper: read how much should be paid for a given project key, at a given time
    /// @dev Requires that the payout has been fully approved by the 4-of-4 multisig
    ///      for this specific project (key).
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
