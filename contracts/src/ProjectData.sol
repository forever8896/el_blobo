// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProjectData
/// @notice Single-project contract that evaluates required payment based on
///         project status, deadlines, and a linear diminishing schedule.
contract ProjectData {
    // -----------------------------
    // Types
    // -----------------------------

    enum Status {
        WIP,  // Work in progress
        Done  // Completed (no payment required)
    }

    /// @dev Full on-chain project data struct
    struct Data {
        address assignee;      // Who should work on it
        uint64 createdAt;      // Creation timestamp
        uint64 beginDeadline;  // Time where assignee can get 100% of payment
        uint64 endDeadline;    // Time where assignee gets 0% of payment
        uint256 totalReward;   // Maximum payment amount (100% at beginDeadline)
        uint256 dbId;          // Off-chain database id
        Status status;         // WIP / Done
    }

    /// @dev View-only struct (no mappings) returned by getProject()
    struct ProjectView {
        address assignee;
        uint64 createdAt;
        uint64 beginDeadline;
        uint64 endDeadline;
        uint256 totalReward;
        uint256 dbId;
        Status status;
    }

    // -----------------------------
    // Storage
    // -----------------------------

    /// @notice Global creator / admin of this project
    address public immutable owner;

    /// @notice The single project managed by this contract instance
    Data private project;

    // -----------------------------
    // Events
    // -----------------------------

    event ProjectInitialized(
        address indexed owner,
        address indexed assignee,
        uint256 totalReward,
        uint64 beginDeadline,
        uint64 endDeadline,
        uint256 dbId
    );

    event StatusChanged(Status oldStatus, Status newStatus);

    // -----------------------------
    // Constructor & modifiers
    // -----------------------------

    /// @notice Initialize the project and the owner in the constructor
    /// @param _owner Global admin of the project (can change status)
    /// @param _assignee The address assigned to deliver the project
    /// @param _beginDeadline Timestamp where reward is 100% if project is still WIP
    /// @param _endDeadline Timestamp where reward decays to 0% (if still WIP)
    /// @param _dbId Off-chain database id that stores all project metadata
    /// @param _totalReward Maximum payment amount (e.g., in some off-chain or separate token)
    constructor(
        address _owner,
        address _assignee,
        uint64 _beginDeadline,
        uint64 _endDeadline,
        uint256 _dbId,
        uint256 _totalReward
    ) {
        require(_owner != address(0), "owner = zero");
        require(_assignee != address(0), "assignee = zero");
        require(_endDeadline > _beginDeadline, "bad deadlines");
        require(_totalReward > 0, "totalReward = 0");

        owner = _owner;

        project.assignee = _assignee;
        project.createdAt = uint64(block.timestamp);
        project.beginDeadline = _beginDeadline;
        project.endDeadline = _endDeadline;
        project.totalReward = _totalReward;
        project.dbId = _dbId;
        project.status = Status.WIP;

        emit ProjectInitialized(
            _owner,
            _assignee,
            _totalReward,
            _beginDeadline,
            _endDeadline,
            _dbId
        );
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    // -----------------------------
    // External / public functions
    // -----------------------------

    /// @notice Change the status of the project
    /// @dev Only the global owner can change status (off-chain process decides when it's Done)
    function setStatus(Status newStatus) external onlyOwner {
        Status oldStatus = project.status;
        if (oldStatus == newStatus) {
            return; // no-op
        }

        project.status = newStatus;
        emit StatusChanged(oldStatus, newStatus);
    }

    /// @notice Evaluate how much should be paid for the project at a given time
    /// @param atTime Timestamp at which to evaluate. If 0, uses block.timestamp.
    /// @return paymentRequired Amount that should be paid given current status and time
    ///
    /// Logic:
    ///   - If status == Done: 0
    ///   - If status == WIP:
    ///       * t <= beginDeadline: full totalReward
    ///       * t >= endDeadline:   0
    ///       * else:               linearly from totalReward -> 0
    function evaluatePayment(uint256 atTime)
        external
        view
        returns (uint256 paymentRequired)
    {
        Data storage p = project;

        if (p.status == Status.Done) {
            return 0;
        }

        uint256 t = atTime == 0 ? block.timestamp : atTime;

        if (t <= p.beginDeadline) {
            return p.totalReward;
        }
        if (t >= p.endDeadline) {
            return 0;
        }

        uint256 duration = p.endDeadline - p.beginDeadline;
        uint256 remaining = p.endDeadline - t;

        // Linear from 100% at beginDeadline to 0% at endDeadline
        return (p.totalReward * remaining) / duration;
    }

    /// @notice Get basic project info
    function getProject() external view returns (ProjectView memory v) {
        Data storage p = project;

        v.assignee = p.assignee;
        v.createdAt = p.createdAt;
        v.beginDeadline = p.beginDeadline;
        v.endDeadline = p.endDeadline;
        v.totalReward = p.totalReward;
        v.dbId = p.dbId;
        v.status = p.status;
    }
}
