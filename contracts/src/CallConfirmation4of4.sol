// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title CallConfirmation4of4
/// @notice 4-of-4 multisig-style "call confirmation" contract:
///         assignee + 3 committee members must all approve a given callId.
contract CallConfirmation4of4 {
    // -----------------------------
    // Storage
    // -----------------------------

    address public immutable assignee;
    address[3] public immutable committee;

    // callId => signer => approved
    mapping(bytes32 => mapping(address => bool)) public approvedBy;

    // callId => number of approvals (0..4)
    mapping(bytes32 => uint8) public approvalCount;

    // -----------------------------
    // Events
    // -----------------------------

    event Approved(bytes32 indexed callId, address indexed signer);

    // -----------------------------
    // Constructor
    // -----------------------------

    /// @param _assignee The assignee participant
    /// @param _committee Three committee members
    constructor(address _assignee, address[3] memory _committee) {
        require(_assignee != address(0), "assignee = zero");
        require(
            _committee[0] != address(0) &&
                _committee[1] != address(0) &&
                _committee[2] != address(0),
            "committee zero"
        );

        assignee = _assignee;
        committee = _committee;
    }

    // -----------------------------
    // Modifiers
    // -----------------------------

    modifier onlyParticipant() {
        require(_isParticipant(msg.sender), "not participant");
        _;
    }

    // -----------------------------
    // Public / external API
    // -----------------------------

    /// @notice Approve a call, identified by callId
    /// @dev callId can be e.g. keccak256(abi.encode(target, value, data, nonce))
    function approve(bytes32 callId) external onlyParticipant {
        require(!approvedBy[callId][msg.sender], "already approved");

        approvedBy[callId][msg.sender] = true;

        // bump count
        unchecked {
            approvalCount[callId] += 1;
        }

        emit Approved(callId, msg.sender);
    }

    /// @notice Returns true if all 4 participants (assignee + 3 committee) have approved this callId
    function isConfirmed(bytes32 callId) external view returns (bool) {
        return approvalCount[callId] == 4;
    }

    /// @notice Convenience: return all 4 participants in a single array
    function getParticipants() external view returns (address[4] memory out) {
        out[0] = assignee;
        out[1] = committee[0];
        out[2] = committee[1];
        out[3] = committee[2];
    }

    // -----------------------------
    // Internal helpers
    // -----------------------------

    function _isParticipant(address who) internal view returns (bool) {
        if (who == assignee) return true;
        for (uint256 i = 0; i < 3; i++) {
            if (committee[i] == who) return true;
        }
        return false;
    }
}
