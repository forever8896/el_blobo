// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ProjectData } from "./ProjectData.sol";

/// @title ProjectRegistry
/// @notice Registry that maps an address to a project, where each project
///         is comprised of a single ProjectData instance.
contract ProjectRegistry {
    // -----------------------------
    // Types
    // -----------------------------

    struct RegisteredProject {
        ProjectData projectData; // Single-project evaluator
    }

    // -----------------------------
    // Storage
    // -----------------------------

    /// @notice Admin / status controller for the ProjectData
    address public owner;

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

    // -----------------------------
    // Constructor
    // -----------------------------

    constructor(address _owner) {
        require(_owner != address(0), "owner = zero");
        owner = _owner;
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
}
