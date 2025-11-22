// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CallConfirmation4of4
/// @notice 4-of-4 multisig-style approval between assignee + 3 committee members.
///         Each participant can approve a given callId once; isConfirmed(callId)
///         returns true only if all 4 have approved.
contract CallConfirmation4of4 {
    /// @notice Assignee
    address public immutable assignee;

    /// @notice Committee members
    address public immutable committee0;
    address public immutable committee1;
    address public immutable committee2;

    /// @dev callId => signer => approved?
    mapping(bytes32 => mapping(address => bool)) public approved;

    /// @dev callId => number of approvals (0..4)
    mapping(bytes32 => uint256) public approvalCount;

    event Approved(bytes32 indexed callId, address indexed signer, uint256 count);

    constructor(address _assignee, address[3] memory committee) {
        require(_assignee != address(0), "assignee = zero");
        require(committee[0] != address(0), "committee0 = zero");
        require(committee[1] != address(0), "committee1 = zero");
        require(committee[2] != address(0), "committee2 = zero");

        assignee = _assignee;
        committee0 = committee[0];
        committee1 = committee[1];
        committee2 = committee[2];
    }

    /// @notice Check if an address is one of the 4 participants
    function isParticipant(address account) public view returns (bool) {
        return (
            account == assignee ||
            account == committee0 ||
            account == committee1 ||
            account == committee2
        );
    }

    modifier onlyParticipant() {
        require(isParticipant(msg.sender), "not participant");
        _;
    }

    /// @notice Approve a specific callId
    /// @dev Reverts if caller is not a participant or has already approved.
    function approve(bytes32 callId) external onlyParticipant {
        require(!approved[callId][msg.sender], "already approved");

        approved[callId][msg.sender] = true;
        uint256 newCount = approvalCount[callId] + 1;
        approvalCount[callId] = newCount;

        emit Approved(callId, msg.sender, newCount);
    }

    /// @notice Returns true if all 4 participants have approved this callId
    function isConfirmed(bytes32 callId) external view returns (bool) {
        return approvalCount[callId] == 4;
    }
}
