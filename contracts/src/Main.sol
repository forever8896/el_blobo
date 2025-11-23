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

    /// @notice Per-user recorded reward (in *asset* units, not shares)
    mapping(address => uint256) public userReward;

    address[3] commiteeMembers = [address(0x8Ec01FaD4383612bfc857F4d76F7f62D0fb4f46F), address(0x783CD4B360ACa13b1A5374aB8105932AF47d513E), address(0x526a4C270897FF531408cb1282Db9153517F7739)];
    
    // ------------------------------------------------------------------------
    // Constructor & ownership
    // ------------------------------------------------------------------------

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

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "new owner = zero");
        owner = newOwner;
    }

    // ------------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------------

    function _projectCallId(address key) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("PROJECT_PAYOUT", key));
    }

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

    function registerUser(
        address userAddress,
        address bigSponsor,
        address smallSponsor
    ) external payable {
        require(userAddress != address(0), "user = zero");
        require(userAddress == msg.sender, "can only self-register");

        uint256 price = vault.registrationPrice();
        // Either enforce exact payment:
        require(msg.value == price, "wrong registration fee");
        // or keep >= and only deposit `price` – your choice

        // Register user + sponsors in Users registry
        users.register(userAddress, bigSponsor, smallSponsor);

        emit UserRegistered(userAddress);

        // Store native token in the vault and mint shares to vaultOwner
        vault.deposit{value: msg.value}(msg.value);
    }


    function isRegistered(address userAddr) external view returns (bool) {
        return users.isUser(userAddr);
    }

    // ------------------------------------------------------------------------
    // Project lifecycle
    // ------------------------------------------------------------------------

    function createProject(
        address key,
        address assignee,
        uint64 beginDeadline,
        uint64 endDeadline,
        uint256 dbId,
        uint256 totalReward
    ) external {
        projectRegistry.createProject(
            key,
            assignee,
            beginDeadline,
            endDeadline,
            dbId,
            totalReward,
            commiteeMembers
        );
    }

    function signProject(address key) external {
        (ProjectData pd, CallConfirmation4of4 ms) =
            _getProjectInfoOrRevert(key);

        // Don’t allow signing after project is already Done
        ProjectData.ProjectView memory v = pd.getProject();
        require(v.status != ProjectData.Status.Done, "project already done");

        bytes32 callId = _projectCallId(key);
        ms.approve(callId);

        if (ms.isConfirmed(callId)) {
            _finalizeProject(key);
        }
    }

    function finalizeProject(address key) external {
        (ProjectData pd, CallConfirmation4of4 ms) =
            _getProjectInfoOrRevert(key);
        bytes32 callId = _projectCallId(key);
        require(ms.isConfirmed(callId), "not fully signed");

        ProjectData.ProjectView memory v = pd.getProject();
        require(v.status != ProjectData.Status.Done, "project already done");

        _finalizeProject(key);
    }

    /// @dev Internal finalization logic:
    ///      - Evaluate reward (in asset units)
    ///      - Convert to shares using RewardVault pricing (sanity check)
    ///      - Split reward among user & sponsors in `userReward` (asset units)
    ///      - Mark project as Done
    function _finalizeProject(address key) internal {
        ProjectData projectData = projectRegistry.getProject(key);

        // Evaluate reward at current time (asset units)
        uint256 assets = projectData.evaluatePayment(block.timestamp);
        require(assets > 0, "no reward to pay");

        // Sanity check against vault’s share pricing
        uint256 shares = vault.convertToShares(assets);
        require(shares > 0, "reward too small");
        require(vault.unallocatedShares() >= shares, "insufficient vault shares");

        // Split the asset reward to user + sponsors
        payShares(key);

        // Mark project as Done
        projectData.setStatus(ProjectData.Status.Done);
    }

    /// @notice Split the reward for `user` (project key) to user & sponsors
    /// @dev Stores amounts in `userReward[...]` in **asset units**.
    function payShares(address user) internal {
        // Get how much goes to user / big sponsor / small sponsor (in assets)
        (
            uint256 userAmount,
            uint256 bigSponsorAmount,
            uint256 smallSponsorAmount
        ) = getRewardShares(user);

        // Look up sponsors from Users registry
        (address bigSponsor, address smallSponsor) = users.getSponsors(user);

        // Credit user
        if (userAmount > 0) {
            userReward[user] += userAmount;
        }

        // Credit big sponsor, if any
        if (bigSponsor != address(0) && bigSponsorAmount > 0) {
            userReward[bigSponsor] += bigSponsorAmount;
        }

        // Credit small sponsor, if any
        if (smallSponsor != address(0) && smallSponsorAmount > 0) {
            userReward[smallSponsor] += smallSponsorAmount;
        }
    }

    /// @notice Convenience view that:
    ///         1) Evaluates the total payout for a project key at "now"
    ///         2) Runs the sponsor split via `Users.evaluatePayout`
    function getRewardShares(address key)
        public
        view
        returns (
            uint256 userAmount,
            uint256 bigSponsorAmount,
            uint256 smallSponsorAmount
        )
    {
        uint256 amount = evaluatePaymentFor(key, block.timestamp);
        return evaluatePayouts(key, amount);
    }

    /// @notice Withdraw the *asset* reward for `assignee` and convert to vault shares
    /// @dev Uses asset amounts from `userReward[assignee]`, converts to shares,
    ///      and assigns shares inside the RewardVault.
    function withdrawProjectReward(address key, address assignee)
        external
        returns (uint256 allocatedShares)
    {
        require(assignee != address(0), "assignee = zero");

        // Require project is Done
        ProjectData projectData = projectRegistry.getProject(key);
        ProjectData.ProjectView memory v = projectData.getProject();
        require(v.status == ProjectData.Status.Done, "project not finalized");

        // Use the *user’s* recorded reward in assets
        uint256 amount = userReward[assignee];
        require(amount > 0, "no reward recorded");

        require(msg.sender == assignee, "only assignee can claim");

        // Clear before external call
        userReward[assignee] = 0;

        // Convert asset amount to vault shares and allocate them
        uint256 shares = vault.convertToShares(amount);
        require(shares > 0, "amount too small");

        vault.transferShares(shares, assignee);
        return shares;
    }

    // ------------------------------------------------------------------------
    // Admin: update registration price via RewardVault
    // ------------------------------------------------------------------------

    function updateRegistrationPrice(uint256 price) external onlyOwner {
        require(price > 0, "price = 0");
        vault.setRegistrationPrice(price);
    }

    // ------------------------------------------------------------------------
    // Read-only helpers
    // ------------------------------------------------------------------------

    function evaluatePaymentFor(address key, uint256 atTime)
        public
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

    function evaluatePayouts(address user, uint256 amount)
        public
        view
        returns (
            uint256 userAmount,
            uint256 bigSponsorAmount,
            uint256 smallSponsorAmount
        )
    {
        (
            address userAddr,
            uint256 _userAmount,
            address bigSponsorAddr,
            uint256 _bigAmount,
            address smallSponsorAddr,
            uint256 _smallAmount
        ) = users.evaluatePayout(user, amount);

        // Optional sanity check that the primary address matches
        require(userAddr == user, "Users: mismatched user");

        userAmount = _userAmount;
        bigSponsorAmount = _bigAmount;
        smallSponsorAmount = _smallAmount;
    }

}
