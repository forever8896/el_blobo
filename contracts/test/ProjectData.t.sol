// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ProjectData.sol";

contract ProjectDataTest is Test {
    ProjectData internal project;

    address internal owner = address(0xA11CE);
    address internal assignee = address(0xBEEF);

    uint64 internal beginDeadline = 100;
    uint64 internal endDeadline = 200;
    uint256 internal dbId = 1;
    uint256 internal totalReward = 1_000 ether;

    function setUp() public {
        // Set a deterministic timestamp for creation
        vm.warp(10);

        project = new ProjectData(
            owner,
            assignee,
            beginDeadline,
            endDeadline,
            dbId,
            totalReward
        );
    }

    // -----------------------------
    // Constructor tests
    // -----------------------------

    function testConstructorInitializesState() public view {
        // Owner
        assertEq(project.owner(), owner, "owner mismatch");

        // Project data
        ProjectData.ProjectView memory v = project.getProject();

        assertEq(v.assignee, assignee, "assignee mismatch");
        assertEq(v.beginDeadline, beginDeadline, "beginDeadline mismatch");
        assertEq(v.endDeadline, endDeadline, "endDeadline mismatch");
        assertEq(v.totalReward, totalReward, "totalReward mismatch");
        assertEq(v.dbId, dbId, "dbId mismatch");
        assertEq(uint256(v.status), uint256(ProjectData.Status.WIP), "status should be WIP");

        // createdAt should be the block timestamp at construction (10)
        assertEq(v.createdAt, 10, "createdAt mismatch");
    }

    // -----------------------------
    // Ownership + setStatus tests
    // -----------------------------

    function testSetStatusOnlyOwner() public {
        // Non-owner should revert
        vm.prank(address(0xDEAD));
        vm.expectRevert(bytes("only owner"));
        project.setStatus(ProjectData.Status.Done);
    }

    function testSetStatusByOwner() public {
        vm.prank(owner);
        project.setStatus(ProjectData.Status.Done);

        ProjectData.ProjectView memory v = project.getProject();
        assertEq(uint256(v.status), uint256(ProjectData.Status.Done), "status should be Done");
    }

    function testTransferOwnership() public {
        address newOwner = address(0xB0B);

        // Only current owner can transfer
        vm.prank(owner);
        project.transferOwnership(newOwner);

        assertEq(project.owner(), newOwner, "owner not updated");

        // Old owner can no longer call onlyOwner functions
        vm.prank(owner);
        vm.expectRevert(bytes("only owner"));
        project.setStatus(ProjectData.Status.WIP);

        // New owner can
        vm.prank(newOwner);
        project.setStatus(ProjectData.Status.Done);
    }

    // -----------------------------
    // evaluatePayment tests
    // -----------------------------

    function testEvaluatePaymentReturnsZeroWhenDone() public {
        // Mark as Done
        vm.prank(owner);
        project.setStatus(ProjectData.Status.Done);

        // Any time should give 0
        uint256 amountBefore = project.evaluatePayment(beginDeadline - 1);
        uint256 amountDuring = project.evaluatePayment(beginDeadline + 10);
        uint256 amountAfter = project.evaluatePayment(endDeadline + 1);

        assertEq(amountBefore, 0, "Done: before begin should be 0");
        assertEq(amountDuring, 0, "Done: between begin/end should be 0");
        assertEq(amountAfter, 0, "Done: after end should be 0");
    }

    function testEvaluatePaymentFullBeforeBeginDeadline() public view {
        // Status is WIP by default
        uint256 t = beginDeadline - 1;
        uint256 amount = project.evaluatePayment(t);

        assertEq(amount, totalReward, "before beginDeadline: should be full reward");
    }

    function testEvaluatePaymentZeroAfterEndDeadline() public view {
        uint256 t = endDeadline + 1;
        uint256 amount = project.evaluatePayment(t);

        assertEq(amount, 0, "after endDeadline: should be 0");
    }

    function testEvaluatePaymentLinearBetweenDeadlines() public view {
        // mid-point between begin and end: remaining = (end - mid)
        // begin = 100, end = 200 -> duration = 100
        // pick t = 150 -> remaining = 50 -> 50% -> totalReward / 2
        uint256 t = 150;
        uint256 amount = project.evaluatePayment(t);

        uint256 expected = (totalReward * (endDeadline - t)) / (endDeadline - beginDeadline);
        assertEq(expected, totalReward / 2, "expected 50% of reward");
        assertEq(amount, expected, "linear interpolation incorrect");
    }

    function testEvaluatePaymentUsesBlockTimestampWhenAtTimeZero() public {
        // Warp to a time between begin and end
        vm.warp(150);

        // atTime = 0 -> use block.timestamp (150)
        uint256 amount = project.evaluatePayment(0);

        uint256 expected = (totalReward * (endDeadline - block.timestamp))
            / (endDeadline - beginDeadline);

        assertEq(amount, expected, "should use block.timestamp when atTime == 0");
    }

        function testEvaluatePaymentLinearBetweenDeadlines_75Percent() public view {
        // begin = 100, end = 200, duration = 100
        // take t = 125 -> remaining = 75 -> 75% of totalReward
        uint256 t = beginDeadline + (endDeadline - beginDeadline) / 4; // 125
        uint256 amount = project.evaluatePayment(t);

        uint256 expected = (totalReward * (endDeadline - t)) / (endDeadline - beginDeadline);
        // Sanity: expected should be 75% of totalReward
        assertEq(expected, (totalReward * 75) / 100, "expected 75% of reward");

        assertEq(amount, expected, "linear interpolation incorrect at 25% into interval");
    }

}
