// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Users.sol";
import "../src/User.sol";

contract UsersTest is Test {
    Users internal users;

    address internal alice = address(0xA11CE);
    address internal bob   = address(0xB0B);
    address internal carol = address(0xA11CD);
    address internal dave  = address(0xD0D0);

    // Redeclare event for expectEmit
    event UserRegistered(
        address indexed user,
        address indexed userContract,
        address indexed bigSponsor,
        address smallSponsor
    );

    function setUp() public {
        users = new Users();
    }

    // ------------------------------------------------------------------------
    // register tests
    // ------------------------------------------------------------------------

   function testRegisterNoSponsors() public {
        // We want to check:
        //  - user (topic1)
        //  - bigSponsor (topic3)
        //  - data (smallSponsor)
        // but NOT userContract (topic2), because it's the new User() address.
        vm.expectEmit(true, false, true, true, address(users));
        emit UserRegistered(alice, address(0), address(0), address(0));

        vm.prank(alice);
        users.register(alice, address(0), address(0));

        // userContracts mapping populated
        User u = users.userContracts(alice);
        assertTrue(address(u) != address(0), "User contract not stored");

        // check underlying User state
        assertEq(u.user(), alice, "user mismatch");
        assertEq(u.bigSponsor(), address(0), "bigSponsor should be zero");
        assertEq(u.smallSponsor(), address(0), "smallSponsor should be zero");

        // isUser view
        assertTrue(users.isUser(alice), "isUser should be true");
    }

    function testRegisterWithBigSponsorOnly() public {
        vm.prank(alice);
        users.register(alice, bob, address(0));

        User u = users.userContracts(alice);
        assertEq(u.user(), alice, "user mismatch");
        assertEq(u.bigSponsor(), bob, "bigSponsor mismatch");
        assertEq(u.smallSponsor(), address(0), "smallSponsor should be zero");

        // getSponsors should proxy correctly
        (address big, address small) = users.getSponsors(alice);
        assertEq(big, bob, "getSponsors big mismatch");
        assertEq(small, address(0), "getSponsors small should be zero");
    }

    function testRegisterWithBigAndSmallSponsor() public {
        vm.prank(alice);
        users.register(alice, bob, carol);

        User u = users.userContracts(alice);
        assertEq(u.user(), alice, "user mismatch");
        assertEq(u.bigSponsor(), bob, "bigSponsor mismatch");
        assertEq(u.smallSponsor(), carol, "smallSponsor mismatch");

        (address big, address small) = users.getSponsors(alice);
        assertEq(big, bob, "getSponsors big mismatch");
        assertEq(small, carol, "getSponsors small mismatch");
    }

    function testRegisterRevertsIfAlreadyRegistered() public {
        vm.prank(alice);
        users.register(alice, address(0), address(0));

        vm.prank(alice);
        vm.expectRevert(bytes("user already registered"));
        users.register(alice, address(0), address(0));
    }

    function testRegisterRevertsIfSmallSponsorWithoutBig() public {
        vm.prank(alice);
        vm.expectRevert(bytes("small sponsor requires big sponsor"));
        users.register(alice, address(0), carol);
    }

    function testRegisterRevertsIfSelfBigSponsor() public {
        vm.prank(alice);
        vm.expectRevert(bytes("self big sponsor not allowed"));
        users.register(alice, alice, address(0));
    }

    function testRegisterRevertsIfSelfSmallSponsor() public {
        vm.prank(alice);
        vm.expectRevert(bytes("self small sponsor not allowed"));
        users.register(alice, bob, alice);
    }

    // ------------------------------------------------------------------------
    // isUser tests
    // ------------------------------------------------------------------------

    function testIsUserFalseBeforeRegister() public view {
        assertFalse(users.isUser(alice), "isUser should be false initially");
    }

    function testIsUserTrueAfterRegister() public {
        vm.prank(alice);
        users.register(alice, address(0), address(0));

        assertTrue(users.isUser(alice), "isUser should be true after register");
        assertFalse(users.isUser(bob), "other address should still be false");
    }

    // ------------------------------------------------------------------------
    // getSponsors tests
    // ------------------------------------------------------------------------

    function testGetSponsorsRevertsIfNotRegistered() public {
        vm.expectRevert(bytes("user not registered"));
        users.getSponsors(alice);
    }

    function testGetSponsorsDelegatesToUserContract() public {
        vm.prank(alice);
        users.register(alice, bob, carol);

        (address big, address small) = users.getSponsors(alice);
        assertEq(big, bob, "big sponsor mismatch");
        assertEq(small, carol, "small sponsor mismatch");
    }

    // ------------------------------------------------------------------------
    // evaluatePayout tests
    // ------------------------------------------------------------------------

    function testEvaluatePayoutRevertsIfNotRegistered() public {
        vm.expectRevert(bytes("user not registered"));
        users.evaluatePayout(alice, 1_000 ether);
    }

    function testEvaluatePayoutNoSponsors() public {
        vm.prank(alice);
        users.register(alice, address(0), address(0));

        uint256 amount = 1_000 ether;

        (
            address userAddr,
            uint256 userAmount,
            address bigSponsorAddr,
            uint256 bigAmount,
            address smallSponsorAddr,
            uint256 smallAmount
        ) = users.evaluatePayout(alice, amount);

        assertEq(userAddr, alice, "userAddr mismatch");
        assertEq(userAmount, amount, "userAmount should be full amount");
        assertEq(bigSponsorAddr, address(0), "bigSponsorAddr should be zero");
        assertEq(bigAmount, 0, "bigAmount should be 0");
        assertEq(smallSponsorAddr, address(0), "smallSponsorAddr should be zero");
        assertEq(smallAmount, 0, "smallAmount should be 0");
    }

    function testEvaluatePayoutBigSponsorOnly() public {
        vm.prank(alice);
        users.register(alice, bob, address(0));

        uint256 amount = 1_000 ether;

        (
            address userAddr,
            uint256 userAmount,
            address bigSponsorAddr,
            uint256 bigAmount,
            address smallSponsorAddr,
            uint256 smallAmount
        ) = users.evaluatePayout(alice, amount);

        uint256 expectedBig = (amount * 10) / 100;
        uint256 expectedUser = amount - expectedBig;

        assertEq(userAddr, alice, "userAddr mismatch");
        assertEq(bigSponsorAddr, bob, "bigSponsorAddr mismatch");
        assertEq(smallSponsorAddr, address(0), "smallSponsorAddr should be zero");

        assertEq(bigAmount, expectedBig, "bigAmount mismatch");
        assertEq(userAmount, expectedUser, "userAmount mismatch");
        assertEq(smallAmount, 0, "smallAmount should be 0");
        assertEq(userAmount + bigAmount + smallAmount, amount, "sum must equal total");
    }

    function testEvaluatePayoutBigAndSmallSponsor() public {
        vm.prank(alice);
        users.register(alice, bob, carol);

        uint256 amount = 1_000 ether;

        (
            address userAddr,
            uint256 userAmount,
            address bigSponsorAddr,
            uint256 bigAmount,
            address smallSponsorAddr,
            uint256 smallAmount
        ) = users.evaluatePayout(alice, amount);

        uint256 expectedBig = (amount * 10) / 100;
        uint256 expectedSmall = (amount * 5) / 100;
        uint256 expectedUser = amount - expectedBig - expectedSmall;

        assertEq(userAddr, alice, "userAddr mismatch");
        assertEq(bigSponsorAddr, bob, "bigSponsorAddr mismatch");
        assertEq(smallSponsorAddr, carol, "smallSponsorAddr mismatch");

        assertEq(bigAmount, expectedBig, "bigAmount mismatch");
        assertEq(smallAmount, expectedSmall, "smallAmount mismatch");
        assertEq(userAmount, expectedUser, "userAmount mismatch");
        assertEq(userAmount + bigAmount + smallAmount, amount, "sum must equal total");
    }

    function testEvaluatePayoutRoundingGoesToUser() public {
        vm.prank(alice);
        users.register(alice, bob, carol);

        uint256 amount = 101; // small amount to see integer rounding

        (
            address userAddr,
            uint256 userAmount,
            address bigSponsorAddr,
            uint256 bigAmount,
            address smallSponsorAddr,
            uint256 smallAmount
        ) = users.evaluatePayout(alice, amount);

        // From User logic:
        // big = floor(101 * 10 / 100) = 10
        // small = floor(101 * 5 / 100) = 5
        // user = 101 - 10 - 5 = 86
        assertEq(userAddr, alice, "userAddr mismatch");
        assertEq(bigSponsorAddr, bob, "bigSponsorAddr mismatch");
        assertEq(smallSponsorAddr, carol, "smallSponsorAddr mismatch");

        assertEq(bigAmount, 10, "bigAmount mismatch");
        assertEq(smallAmount, 5, "smallAmount mismatch");
        assertEq(userAmount, 86, "userAmount should hold rounding dust");
        assertEq(userAmount + bigAmount + smallAmount, amount, "sum must equal total");
    }
}
