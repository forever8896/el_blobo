// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ProjectData } from "./ProjectData.sol";
import { CallConfirmation4of4 } from "./CallConfirmation4of4.sol";

/// @title ProjectRegistry
/// @notice Registry that maps an address to a project, where each project
///         is comprised of a single ProjectData instance and an associated multisig.
contract ProjectRegistry {
    // -----------------------------
    // Types
    // -----------------------------

    struct RegisteredProject {
        ProjectData projectData;          // Single-project evaluator
        CallConfirmation4of4 multisig;    // 4-of-4 multisig designated for this project
    }

    // -----------------------------
    // Storage
    // -----------------------------

    /// @notice Admin / status controller for the ProjectData
    address public immutable owner;

    /// @notice Mapping of address → project
    /// @dev You can interpret `key` as:
    ///      - assignee address, or
    ///      - some “project key” address, or
    ///      - any identifier you want to use as an address.
    mapping(address => RegisteredProject) public projects;

    // -----------------------------
    // Events
    // -----------------------------

    event ProjectRegistered(
        address indexed key,
        address indexed projectData
    );

    /// @notice Emitted when a multisig is designated for an existing project
    event ProjectMultisigSet(
        address indexed key,
        address indexed projectData,
        address indexed multisig
    );

    // -----------------------------
    // Constructor
    // -----------------------------

    constructor(address _owner) {
        require(_owner != address(0), "owner = zero");
        owner = _owner;
    }

    // -----------------------------
    // Modifiers
    // -----------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    // -----------------------------
    // External API
    // -----------------------------

    /// @notice Deploy a new ProjectData and register it under `key`
    /// @param key           The mapping key (e.g., assignee address or arbitrary project address)
    /// @param assignee      The assignee (passed to ProjectData)
    /// @param beginDeadline Start of 100% payment window (ProjectData)
    /// @param endDeadline   End of window (0% after this, ProjectData)
    /// @param dbId          Off-chain database id (used only inside ProjectData)
    /// @param totalReward   Max payment amount for this project (used by ProjectData)
    function createProject(
        address key,
        address assignee,
        uint64 beginDeadline,
        uint64 endDeadline,
        uint256 dbId,
        uint256 totalReward
    ) external onlyOwner returns (ProjectData projectData) {
        require(key != address(0), "key = zero");
        require(address(projects[key].projectData) == address(0), "project exists");

        // Deploy the single-project ProjectData with given parameters
        projectData = new ProjectData(
            owner,        // registry owner remains the admin/status controller
            assignee,
            beginDeadline,
            endDeadline,
            dbId,
            totalReward
        );

        // Store in mapping
        RegisteredProject storage rp = projects[key];
        rp.projectData = projectData;

        emit ProjectRegistered(key, address(projectData));
    }

    /// @notice Set the multisig contract for an existing project
    /// @dev One-time operation per project; reverts if already set.
    /// @param key      The project key used in `projects` mapping
    /// @param multisig The CallConfirmation4of4 instance designated for this project
    function setProjectMultisig(address key, CallConfirmation4of4 multisig)
        external
        onlyOwner
    {
        require(key != address(0), "key = zero");
        require(address(multisig) != address(0), "multisig = zero");

        RegisteredProject storage rp = projects[key];
        require(address(rp.projectData) != address(0), "project not found");
        require(address(rp.multisig) == address(0), "multisig already set");

        rp.multisig = multisig;

        emit ProjectMultisigSet(key, address(rp.projectData), address(multisig));
    }

    // -----------------------------
    // External view API
    // -----------------------------

    /// @notice Helper: return the ProjectData for a given key
    function getProject(address key)
        external
        view
        returns (ProjectData projectData)
    {
        return projects[key].projectData;
    }

    /// @notice Helper: return both ProjectData and its multisig for a given key
    function getProjectInfo(address key)
        external
        view
        returns (ProjectData projectData, CallConfirmation4of4 multisig)
    {
        RegisteredProject storage rp = projects[key];
        return (rp.projectData, rp.multisig);
    }
}
