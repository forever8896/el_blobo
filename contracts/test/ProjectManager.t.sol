// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ProjectManager.sol";

contract ProjectManagerTest is Test {
    ProjectManager internal pm;

    address internal creator;
    address internal assignee;
    address internal judge1;
    address internal judge2;
    address internal judge3;
    address internal stranger;

    uint64 internal baseTime;

    function setUp() public {
        pm = new ProjectManager();

        creator = makeAddr("creator");
        assignee = makeAddr("assignee");
        judge1 = makeAddr("judge1");
        judge2 = makeAddr("judge2");
        judge3 = makeAddr("judge3");
        stranger = makeAddr("stranger");

        vm.deal(creator, 100 ether);
        vm.deal(assignee, 0);
        vm.deal(judge1, 0);
        vm.deal(judge2, 0);
        vm.deal(judge3, 0);
        vm.deal(stranger, 0);

        baseTime = 1_000_000;
        vm.warp(baseTime);
    }

    // helper: default committee array
    function _committee()
        internal
        view
        returns (address[3] memory committee)
    {
        committee[0] = judge1;
        committee[1] = judge2;
        committee[2] = judge3;
    }

    // helper: create a standard project
    function _createDefaultProject()
        internal
        returns (uint256 projectId, uint64 beginDeadline, uint64 endDeadline)
    {
        address[3] memory committee = _committee();

        beginDeadline = baseTime + 100;
        endDeadline = baseTime + 1_100;

        vm.prank(creator);
        projectId = pm.createProject{value: 1 ether}(
            assignee,
            committee,
            beginDeadline,
            endDeadline,
            42
        );
    }

    // -----------------------------
    // Creation tests
    // -----------------------------

    function testCreateProjectStoresFields() public {
        (uint256 projectId, uint64 beginDeadline, uint64 endDeadline) =
            _createDefaultProject();

        (
            address creatorOut,
            address assigneeOut,
            uint64 createdAt,
            uint64 beginOut,
            uint64 endOut,
            uint256 totalReward,
            uint256 paidOut,
            uint256 dbId,
            address[3] memory committeeOut,
            ProjectManager.Status status,
            string memory projectUri,
            uint8 committeeApprovalCount,
            bool assigneeApproved,
            bool creatorClaimedRemainder
        ) = pm.getProject(projectId);

        assertEq(creatorOut, creator, "creator mismatch");
        assertEq(assigneeOut, assignee, "assignee mismatch");
        assertEq(createdAt, baseTime, "createdAt mismatch");
        assertEq(beginOut, beginDeadline, "beginDeadline mismatch");
        assertEq(endOut, endDeadline, "endDeadline mismatch");
        assertEq(totalReward, 1 ether, "totalReward mismatch");
        assertEq(paidOut, 0, "paidOut should be 0");
        assertEq(dbId, 42, "dbId mismatch");
        assertEq(committeeOut[0], judge1, "committee[0]");
        assertEq(committeeOut[1], judge2, "committee[1]");
        assertEq(committeeOut[2], judge3, "committee[2]");
        assertEq(uint8(status), uint8(ProjectManager.Status.WIP), "status");
        assertEq(bytes(projectUri).length, 0, "URI should be empty");
        assertEq(committeeApprovalCount, 0, "approvals should be 0");
        assertEq(assigneeApproved, false, "assigneeApproved should be false");
        assertEq(
            creatorClaimedRemainder,
            false,
            "creatorClaimedRemainder should be false"
        );
    }

    function testCreateProjectRevertsIfNoReward() public {
        address[3] memory committee = _committee();
        uint64 beginDeadline = baseTime + 100;
        uint64 endDeadline = baseTime + 200;

        vm.prank(creator);
        vm.expectRevert("no reward funded");
        pm.createProject{value: 0}(
            assignee,
            committee,
            beginDeadline,
            endDeadline,
            1
        );
    }

    function testCreateProjectRevertsIfZeroAssignee() public {
        address[3] memory committee = _committee();
        uint64 beginDeadline = baseTime + 100;
        uint64 endDeadline = baseTime + 200;

        vm.prank(creator);
        vm.expectRevert("assignee = zero");
        pm.createProject{value: 1 ether}(
            address(0),
            committee,
            beginDeadline,
            endDeadline,
            1
        );
    }

    function testCreateProjectRevertsIfBadDeadlines() public {
        address[3] memory committee = _committee();
        uint64 beginDeadline = baseTime + 100;
        uint64 endDeadline = baseTime + 50; // end < begin

        vm.prank(creator);
        vm.expectRevert("bad deadlines");
        pm.createProject{value: 1 ether}(
            assignee,
            committee,
            beginDeadline,
            endDeadline,
            1
        );
    }

    // -----------------------------
    // URI tests
    // -----------------------------

    function testSetProjectUriByCreator() public {
        (uint256 projectId,,) = _createDefaultProject();

        string memory uri = "ipfs://project-state-1";

        vm.prank(creator);
        pm.setProjectUri(projectId, uri);

        (
            ,,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            string memory projectUri,
            ,
            ,
            
        ) = pm.getProject(projectId);

        assertEq(projectUri, uri, "URI mismatch");
    }

    function testSetProjectUriByAssignee() public {
        (uint256 projectId,,) = _createDefaultProject();

        string memory uri = "ipfs://project-state-2";

        vm.prank(assignee);
        pm.setProjectUri(projectId, uri);

        (
            ,,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            string memory projectUri,
            ,
            ,
            
        ) = pm.getProject(projectId);

        assertEq(projectUri, uri, "URI mismatch");
    }

    function testSetProjectUriRevertsIfUnauthorized() public {
        (uint256 projectId,,) = _createDefaultProject();

        vm.prank(stranger);
        vm.expectRevert("not creator/assignee");
        pm.setProjectUri(projectId, "ipfs://not-allowed");
    }

    // -----------------------------
    // Approval tests
    // -----------------------------

    function testApprovePayoutAssigneeAndCommittee() public {
        (uint256 projectId,,) = _createDefaultProject();

        // assignee approves
        vm.prank(assignee);
        pm.approvePayout(projectId);

        // 2 committee members approve
        vm.prank(judge1);
        pm.approvePayout(projectId);

        vm.prank(judge2);
        pm.approvePayout(projectId);

        (
            ,,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            uint8 committeeApprovalCount,
            bool assigneeApproved,
            
        ) = pm.getProject(projectId);

        assertTrue(assigneeApproved, "assigneeApproved should be true");
        assertEq(
            committeeApprovalCount,
            2,
            "committeeApprovalCount should be 2"
        );
    }

    function testApprovePayoutRevertsIfUnauthorized() public {
        (uint256 projectId,,) = _createDefaultProject();

        vm.prank(stranger);
        vm.expectRevert("not authorized approver");
        pm.approvePayout(projectId);
    }

    function testApprovePayoutRevertsDoubleApproval() public {
        (uint256 projectId,,) = _createDefaultProject();

        vm.prank(judge1);
        pm.approvePayout(projectId);

        vm.prank(judge1);
        vm.expectRevert("already approved");
        pm.approvePayout(projectId);
    }

    // -----------------------------
    // Finalization / payout tests
    // -----------------------------

    function _approveAllFor(uint256 projectId) internal {
        vm.prank(assignee);
        pm.approvePayout(projectId);

        vm.prank(judge1);
        pm.approvePayout(projectId);

        vm.prank(judge2);
        pm.approvePayout(projectId);
    }

    function testFinalizeLinearPayoutHalfway() public {
        (uint256 projectId, uint64 beginDeadline, uint64 endDeadline) =
            _createDefaultProject();

        _approveAllFor(projectId);

        // warp to exactly halfway between begin and end
        uint64 mid = beginDeadline + (endDeadline - beginDeadline) / 2;
        vm.warp(mid);

        uint256 assigneeBefore = assignee.balance;
        uint256 contractBefore = address(pm).balance;

        pm.finalizeProject(projectId);

        (
            ,,
            ,
            ,
            ,
            uint256 totalReward,
            uint256 paidOut,
            ,
            ,
            ProjectManager.Status status,
            ,
            ,
            ,
            
        ) = pm.getProject(projectId);

        // At halfway, reward should be ~50% of totalReward
        assertEq(status, ProjectManager.Status.Done, "status should be Done");
        assertEq(totalReward, 1 ether, "totalReward mismatch");
        assertEq(paidOut, 0.5 ether, "paidOut should be 50%");

        assertEq(
            assignee.balance,
            assigneeBefore + paidOut,
            "assignee balance mismatch"
        );
        assertEq(
            address(pm).balance,
            contractBefore - paidOut,
            "contract balance mismatch"
        );
    }

    function testFinalizeAtBeginGetsFullReward() public {
        (uint256 projectId, uint64 beginDeadline,) =
            _createDefaultProject();

        _approveAllFor(projectId);

        vm.warp(beginDeadline); // at begin -> 100%

        uint256 assigneeBefore = assignee.balance;

        pm.finalizeProject(projectId);

        (, , , , , uint256 totalReward, uint256 paidOut,,,,,,) = pm
            .getProject(projectId);

        assertEq(paidOut, totalReward, "should pay full reward at begin");
        assertEq(
            assignee.balance,
            assigneeBefore + totalReward,
            "assignee balance mismatch"
        );
    }

    function testFinalizeAtEndGetsZeroReward() public {
        (uint256 projectId, uint64 beginDeadline, uint64 endDeadline) =
            _createDefaultProject();

        _approveAllFor(projectId);

        // warp exactly to endDeadline
        vm.warp(endDeadline);

        uint256 assigneeBefore = assignee.balance;
        uint256 contractBefore = address(pm).balance;

        pm.finalizeProject(projectId);

        (, , , , , uint256 totalReward, uint256 paidOut,,,,,,) = pm
            .getProject(projectId);

        assertEq(paidOut, 0, "paidOut should be zero at end");
        assertEq(
            assignee.balance,
            assigneeBefore,
            "assignee balance should not change"
        );
        assertEq(
            address(pm).balance,
            contractBefore,
            "contract balance should not change"
        );
        // still Done, and creator can withdraw full remainder
        assertEq(totalReward, 1 ether, "totalReward mismatch");
    }

    function testFinalizeRevertsTooEarly() public {
        (uint256 projectId, uint64 beginDeadline,) =
            _createDefaultProject();

        _approveAllFor(projectId);

        // just before begin
        vm.warp(beginDeadline - 1);

        vm.expectRevert("too early");
        pm.finalizeProject(projectId);
    }

    function testFinalizeRevertsTooLate() public {
        (uint256 projectId,, uint64 endDeadline) =
            _createDefaultProject();

        _approveAllFor(projectId);

        // just after end
        vm.warp(endDeadline + 1);

        vm.expectRevert("too late");
        pm.finalizeProject(projectId);
    }

    function testFinalizeRevertsWithoutAssigneeApproval() public {
        (uint256 projectId, uint64 beginDeadline,) =
            _createDefaultProject();

        // only committee approve, assignee does not
        vm.prank(judge1);
        pm.approvePayout(projectId);
        vm.prank(judge2);
        pm.approvePayout(projectId);

        vm.warp(beginDeadline + 10);

        vm.expectRevert("assignee not approved");
        pm.finalizeProject(projectId);
    }

    function testFinalizeRevertsWithoutEnoughCommitteeApprovals() public {
        (uint256 projectId, uint64 beginDeadline,) =
            _createDefaultProject();

        // assignee + only 1 committee member approve
        vm.prank(assignee);
        pm.approvePayout(projectId);

        vm.prank(judge1);
        pm.approvePayout(projectId);

        vm.warp(beginDeadline + 10);

        vm.expectRevert("not enough committee approvals");
        pm.finalizeProject(projectId);
    }

    function testFinalizeRevertsIfAlreadyFinalized() public {
        (uint256 projectId, uint64 beginDeadline,) =
            _createDefaultProject();

        _approveAllFor(projectId);
        vm.warp(beginDeadline + 10);

        pm.finalizeProject(projectId);

        vm.expectRevert("already finalized");
        pm.finalizeProject(projectId);
    }

    // -----------------------------
    // Remainder withdrawal tests
    // -----------------------------

    function testWithdrawRemainderOnlyCreator() public {
        (uint256 projectId, uint64 beginDeadline, uint64 endDeadline) =
            _createDefaultProject();

        _approveAllFor(projectId);

        // warp to middle -> 50% payout
        uint64 mid = beginDeadline + (endDeadline - beginDeadline) / 2;
        vm.warp(mid);

        pm.finalizeProject(projectId);

        uint256 creatorBefore = creator.balance;
        uint256 contractBefore = address(pm).balance;

        vm.prank(creator);
        pm.withdrawRemainder(projectId);

        (, , , , , uint256 totalReward, uint256 paidOut,,,,,,) = pm
            .getProject(projectId);

        uint256 remainder = totalReward - paidOut;

        assertEq(
            creator.balance,
            creatorBefore + remainder,
            "creator balance mismatch"
        );
        assertEq(
            address(pm).balance,
            contractBefore - remainder,
            "contract balance mismatch"
        );
    }

    function testWithdrawRemainderRevertsIfNotDone() public {
        (uint256 projectId,,) = _createDefaultProject();

        vm.prank(creator);
        vm.expectRevert("not Done");
        pm.withdrawRemainder(projectId);
    }

    function testWithdrawRemainderRevertsIfNotCreator() public {
        (uint256 projectId, uint64 beginDeadline, uint64 endDeadline) =
            _createDefaultProject();

        _approveAllFor(projectId);

        uint64 mid = beginDeadline + (endDeadline - beginDeadline) / 2;
        vm.warp(mid);

        pm.finalizeProject(projectId);

        vm.prank(stranger);
        vm.expectRevert("not creator");
        pm.withdrawRemainder(projectId);
    }

    function testWithdrawRemainderRevertsIfAlreadyClaimed() public {
        (uint256 projectId, uint64 beginDeadline, uint64 endDeadline) =
            _createDefaultProject();

        _approveAllFor(projectId);

        uint64 mid = beginDeadline + (endDeadline - beginDeadline) / 2;
        vm.warp(mid);

        pm.finalizeProject(projectId);

        vm.prank(creator);
        pm.withdrawRemainder(projectId);

        vm.prank(creator);
        vm.expectRevert("remainder already claimed");
        pm.withdrawRemainder(projectId);
    }
}
