// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/CallConfirmation4of4.sol";

contract CallConfirmation4of4Test is Test {
    CallConfirmation4of4 multisig;

    address assignee   = address(0xA11CE);
    address committee0 = address(0xC001);
    address committee1 = address(0xC002);
    address committee2 = address(0xC003);
    address stranger   = address(0xBEEF);

    bytes32 constant CALL_ID = keccak256("TEST_CALL");

    function setUp() public {
        address[3] memory committee = [committee0, committee1, committee2];
        multisig = new CallConfirmation4of4(assignee, committee);
    }

    // -------------------------------------------------------
    // Constructor / participants
    // -------------------------------------------------------

    function testConstructorStoresParticipants() public {
        assertEq(multisig.assignee(), assignee);
        assertEq(multisig.committee0(), committee0);
        assertEq(multisig.committee1(), committee1);
        assertEq(multisig.committee2(), committee2);
    }

    function testIsParticipantTrueForAllFour() public {
        assertTrue(multisig.isParticipant(assignee));
        assertTrue(multisig.isParticipant(committee0));
        assertTrue(multisig.isParticipant(committee1));
        assertTrue(multisig.isParticipant(committee2));
    }

    function testIsParticipantFalseForOthers() public {
        assertFalse(multisig.isParticipant(stranger));
        assertFalse(multisig.isParticipant(address(0x1234)));
    }

    // -------------------------------------------------------
    // approve()
    // -------------------------------------------------------

    function testApproveFromAssigneeIncrementsCountAndMarksApproved() public {
        // before
        assertEq(multisig.approvalCount(CALL_ID), 0);
        assertFalse(multisig.approved(CALL_ID, assignee));

        vm.prank(assignee);
        multisig.approve(CALL_ID);

        assertEq(multisig.approvalCount(CALL_ID), 1);
        assertTrue(multisig.approved(CALL_ID, assignee));
    }

    function testApproveEmitsEvent() public {
        vm.prank(assignee);

        vm.expectEmit(true, true, false, true);
        emit CallConfirmation4of4.Approved(CALL_ID, assignee, 1);

        multisig.approve(CALL_ID);
    }

    function testApproveRevertsForNonParticipant() public {
        vm.prank(stranger);
        vm.expectRevert("not participant");
        multisig.approve(CALL_ID);
    }

    function testApproveRevertsIfAlreadyApproved() public {
        vm.prank(committee0);
        multisig.approve(CALL_ID);

        vm.prank(committee0);
        vm.expectRevert("already approved");
        multisig.approve(CALL_ID);
    }

    function testApprovalCountsAreIndependentPerCallId() public {
        bytes32 callId1 = keccak256("CALL_1");
        bytes32 callId2 = keccak256("CALL_2");

        vm.prank(assignee);
        multisig.approve(callId1);

        vm.prank(assignee);
        multisig.approve(callId2);

        assertEq(multisig.approvalCount(callId1), 1);
        assertEq(multisig.approvalCount(callId2), 1);
    }

    // -------------------------------------------------------
    // isConfirmed()
    // -------------------------------------------------------

    function testIsConfirmedFalseUntilAllFourApproved() public {
        // No approvals
        assertFalse(multisig.isConfirmed(CALL_ID));

        // 1st approval
        vm.prank(assignee);
        multisig.approve(CALL_ID);
        assertEq(multisig.approvalCount(CALL_ID), 1);
        assertFalse(multisig.isConfirmed(CALL_ID));

        // 2nd approval
        vm.prank(committee0);
        multisig.approve(CALL_ID);
        assertEq(multisig.approvalCount(CALL_ID), 2);
        assertFalse(multisig.isConfirmed(CALL_ID));

        // 3rd approval
        vm.prank(committee1);
        multisig.approve(CALL_ID);
        assertEq(multisig.approvalCount(CALL_ID), 3);
        assertFalse(multisig.isConfirmed(CALL_ID));

        // 4th approval — now should be confirmed
        vm.prank(committee2);
        multisig.approve(CALL_ID);
        assertEq(multisig.approvalCount(CALL_ID), 4);
        assertTrue(multisig.isConfirmed(CALL_ID));
    }
}
