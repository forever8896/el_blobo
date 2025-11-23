// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import "../src/Main.sol";
import "../src/ProjectRegistry.sol";
import "../src/ProjectData.sol";
import "../src/CallConfirmation4of4.sol";
import "../src/Users.sol";
import "../src/User.sol";
import "../src/RewardVault.sol";
import "../src/IRewardVault.sol";

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Simple ERC20 used as the underlying asset for RewardVault in tests.
contract MainTestToken is ERC20 {
    constructor() ERC20("MainTestToken", "MTT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MainTest is Test {
    // ------------------------------------------------------------------------
    // Events (for expectEmit)
    // ------------------------------------------------------------------------

    // Must match Main's event signature
    event UserRegistered(address indexed user);

    // ------------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------------

    Main internal main;
    ProjectRegistry internal registry;
    RewardVault internal vault;
    Users internal users;
    MainTestToken internal asset;

    address internal ownerEOA;     // will also be Main.owner()
    address internal vaultOwner;   // RewardVault.vaultOwner()
    address internal depositor;

    address internal assignee;
    address internal bigSponsor;
    address internal smallSponsor;
    address internal committee0;
    address internal committee1;
    address internal committee2;

    uint256 constant REG_PRICE = 1e9; // registrationPrice == SHARE_UNIT

    uint64 internal beginDeadline = 100;
    uint64 internal endDeadline   = 200;
    uint256 internal dbId         = 1;
    uint256 internal totalReward  = 100 ether;

    // ------------------------------------------------------------------------
    // Setup
    // ------------------------------------------------------------------------

    function setUp() public {
    ownerEOA   = address(this);
    vaultOwner = address(0xD1CE1);
    depositor  = address(0xD1CE0);

    assignee     = address(0xA11CE);
    bigSponsor   = address(0xB166);
    smallSponsor = address(0xC0FFEE);

    committee0 = address(0xC001);
    committee1 = address(0xC002);
    committee2 = address(0xC003);

    // Underlying ERC20 for RewardVault
    asset = new MainTestToken();

    // RewardVault with REG_PRICE = SHARE_UNIT so assets == shares
    vault = new RewardVault(asset, vaultOwner, REG_PRICE);

    // Fund vault via depositor
    uint256 depositAssets = 1_000 ether;
    MainTestToken(address(asset)).mint(depositor, depositAssets);

    vm.startPrank(depositor);
    asset.approve(address(vault), depositAssets);
    vault.deposit(depositAssets);
    vm.stopPrank();

    // Users registry
    users = new Users();

    // 1) Deploy ProjectRegistry, owned by the test contract for now
    registry = new ProjectRegistry(ownerEOA);

    // 2) Deploy Main – owner will be this test contract (address(this))
    main = new Main(
        registry,
        IRewardVault(address(vault)),
        users
    );

    // 3) Hand over the registry to Main so *Main* becomes the owner
    registry.transferOwnership(address(main));
}


    // ------------------------------------------------------------------------
    // Constructor / wiring
    // ------------------------------------------------------------------------

    function testConstructorInitializesState() public view {
        assertEq(address(main.projectRegistry()), address(registry));
        assertEq(address(main.vault()), address(vault));
        assertEq(address(main.users()), address(users));
        assertEq(main.owner(), ownerEOA);
    }

    // ------------------------------------------------------------------------
    // registerUser
    // ------------------------------------------------------------------------

    function testRegisterUserHappyPath() public {
        address user = address(0xABCD);
        address big  = address(0xB155);
        address small = address(0xC155);

        // fund user with native token for fee
        vm.deal(user, 10 ether);

        uint256 price = vault.registrationPrice();
        uint256 fee   = price; // pay exactly registrationPrice

        uint256 ownerBalanceBefore = ownerEOA.balance;

        // Expect Main.UserRegistered(user)
        vm.expectEmit(true, false, false, false, address(main));
        emit UserRegistered(user);

        vm.prank(user);
        main.registerUser{value: fee}(user, big, small);

        // Users registry updated
        assertTrue(users.isUser(user), "Users registry: user not registered");
        assertTrue(main.isRegistered(user), "Main.isRegistered should be true");

        // Fee was forwarded to Main.owner (ownerEOA)
        uint256 ownerBalanceAfter = ownerEOA.balance;
        assertEq(ownerBalanceAfter - ownerBalanceBefore, fee);
    }

    function testRegisterUserRevertsIfFeeBelowPrice() public {
        address user = address(0xABCD);
        vm.deal(user, 10 ether);

        uint256 price = vault.registrationPrice();

        vm.prank(user);
        vm.expectRevert(bytes("fee below registration price"));
        main.registerUser{value: price - 1}(user, address(0), address(0));
    }

    function testRegisterUserRequiresSelfRegistration() public {
        address user = address(0xABCD);
        vm.deal(address(0xDEAD), 10 ether);

        uint256 price = vault.registrationPrice();

        vm.prank(address(0xDEAD));
        vm.expectRevert(bytes("can only self-register"));
        main.registerUser{value: price}(user, address(0), address(0));
    }

    // ------------------------------------------------------------------------
    // Project lifecycle: sign & finalize, reward splitting
    // ------------------------------------------------------------------------

    /// @dev helper: deploy multisig for current assignee
    function _deployMultisigForAssignee() internal returns (CallConfirmation4of4) {
        address[3] memory committee = [committee0, committee1, committee2];
        return new CallConfirmation4of4(assignee, committee);
    }

    function testSignAndFinalizeProjectSplitsRewards() public {
        // 1) Register assignee with big + small sponsor in Users registry
        users.register(assignee, bigSponsor, smallSponsor);

        // 2) Deploy multisig and create project via Main
        CallConfirmation4of4 ms = _deployMultisigForAssignee();

        main.createProject(
            assignee,       // key (we use assignee as project key)
            assignee,       // assignee
            beginDeadline,
            endDeadline,
            dbId,
            totalReward,
            ms
        );

        // 3) 4-of-4 approvals via Main.signProject
        vm.prank(assignee);
        main.signProject(assignee);

        vm.prank(committee0);
        main.signProject(assignee);

        vm.prank(committee1);
        main.signProject(assignee);

        // Final approval triggers _finalizeProject
        vm.prank(committee2);
        main.signProject(assignee);

        // 4) Check reward splits in asset units
        // Rules (User.getPayoutList):
        //  - big  : 10%
        //  - small: 5%
        //  - user : rest (85%)
        uint256 expectedUser  = (totalReward * 85) / 100;
        uint256 expectedBig   = (totalReward * 10) / 100;
        uint256 expectedSmall = (totalReward * 5) / 100;

        assertEq(main.userReward(assignee),    expectedUser,  "user reward mismatch");
        assertEq(main.userReward(bigSponsor),  expectedBig,   "big sponsor reward mismatch");
        assertEq(main.userReward(smallSponsor), expectedSmall, "small sponsor reward mismatch");

        // 5) Project status is Done in ProjectData
        ProjectData pd = registry.getProject(assignee);
        ProjectData.ProjectView memory v = pd.getProject();
        assertEq(uint256(v.status), uint256(ProjectData.Status.Done), "project should be Done");
    }

    function testSignProjectRevertsIfAlreadyDone() public {
        // Setup: same as previous test, but then attempt another sign
        users.register(assignee, bigSponsor, smallSponsor);
        CallConfirmation4of4 ms = _deployMultisigForAssignee();

        main.createProject(
            assignee,
            assignee,
            beginDeadline,
            endDeadline,
            dbId,
            totalReward,
            ms
        );

        // Approvals to finalize
        vm.prank(assignee);
        main.signProject(assignee);

        vm.prank(committee0);
        main.signProject(assignee);

        vm.prank(committee1);
        main.signProject(assignee);

        vm.prank(committee2);
        main.signProject(assignee); // finalizes

        // Now project is Done; another sign should revert
        vm.prank(assignee);
        vm.expectRevert(bytes("project already done"));
        main.signProject(assignee);
    }

    function testFinalizeProjectRevertsIfNotFullySigned() public {
        users.register(assignee, bigSponsor, smallSponsor);
        CallConfirmation4of4 ms = _deployMultisigForAssignee();

        main.createProject(
            assignee,
            assignee,
            beginDeadline,
            endDeadline,
            dbId,
            totalReward,
            ms
        );

        // Only one participant signs
        vm.prank(assignee);
        main.signProject(assignee);

        // Multisig not confirmed yet, finalizeProject must revert
        vm.expectRevert(bytes("not fully signed"));
        main.finalizeProject(assignee);
    }

    function testEvaluatePaymentForRevertsIfNotApprovedByMultisig() public {
        users.register(assignee, address(0), address(0));
        CallConfirmation4of4 ms = _deployMultisigForAssignee();

        main.createProject(
            assignee,
            assignee,
            beginDeadline,
            endDeadline,
            dbId,
            totalReward,
            ms
        );

        // No approvals -> isConfirmed == false
        vm.expectRevert(bytes("payout not fully approved by multisig"));
        main.evaluatePaymentFor(assignee, block.timestamp);
    }

    // ------------------------------------------------------------------------
    // withdrawProjectReward
    // ------------------------------------------------------------------------

    function testWithdrawProjectRewardAllocatesVaultSharesToAssignee() public {
        // Register assignee with NO sponsors so they get 100% of reward
        users.register(assignee, address(0), address(0));

        CallConfirmation4of4 ms = _deployMultisigForAssignee();

        main.createProject(
            assignee,
            assignee,
            beginDeadline,
            endDeadline,
            dbId,
            totalReward,
            ms
        );

        // 4-of-4 approvals to finalize
        vm.prank(assignee);
        main.signProject(assignee);

        vm.prank(committee0);
        main.signProject(assignee);

        vm.prank(committee1);
        main.signProject(assignee);

        vm.prank(committee2);
        main.signProject(assignee);

        // After finalize, assignee should have full reward in asset units
        assertEq(main.userReward(assignee), totalReward, "assignee reward should equal totalReward");

        // No shares yet allocated in the vault
        assertEq(vault.userShares(assignee), 0, "userShares should start at 0");

        // Withdraw must be called by assignee
        vm.prank(assignee);
        uint256 allocatedShares = main.withdrawProjectReward(assignee, assignee);

        uint256 expectedShares = vault.convertToShares(totalReward);
        assertEq(allocatedShares, expectedShares, "allocatedShares mismatch");
        assertEq(vault.userShares(assignee), expectedShares, "vault userShares mismatch");

        // userReward cleared
        assertEq(main.userReward(assignee), 0, "userReward should be cleared");
    }

    function testWithdrawProjectRewardOnlyAssigneeCanClaim() public {
        users.register(assignee, address(0), address(0));
        CallConfirmation4of4 ms = _deployMultisigForAssignee();

        main.createProject(
            assignee,
            assignee,
            beginDeadline,
            endDeadline,
            dbId,
            totalReward,
            ms
        );

        vm.prank(assignee);
        main.signProject(assignee);

        vm.prank(committee0);
        main.signProject(assignee);

        vm.prank(committee1);
        main.signProject(assignee);

        vm.prank(committee2);
        main.signProject(assignee);

        // Non-assignee tries to claim
        address attacker = address(0xDEAD);
        vm.prank(attacker);
        vm.expectRevert(bytes("only assignee can claim"));
        main.withdrawProjectReward(assignee, assignee);
    }

    // ------------------------------------------------------------------------
    // Admin: updateRegistrationPrice
    // ------------------------------------------------------------------------

    function testUpdateRegistrationPriceOnlyOwnerOnMain() public {
        // Call from non-owner should revert with Main's "only owner"
        vm.prank(address(0xBAD));
        vm.expectRevert(bytes("only owner"));
        main.updateRegistrationPrice(2e9);
    }
}
