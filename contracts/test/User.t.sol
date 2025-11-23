// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/User.sol";

contract UserTest is Test {
    address internal alice = address(0xA11CE);
    address internal bob   = address(0xB0B);
    address internal carol = address(0xA11CD);

    // ------------------------------------------------------------------------
    // Constructor tests
    // ------------------------------------------------------------------------

    function testConstructorInitializesNoSponsors() public {
        User u = new User(alice, address(0), address(0));

        assertEq(u.user(), alice, "user mismatch");
        assertEq(u.bigSponsor(), address(0), "bigSponsor should be zero");
        assertEq(u.smallSponsor(), address(0), "smallSponsor should be zero");
    }

    function testConstructorInitializesBigSponsorOnly() public {
        User u = new User(alice, bob, address(0));

        assertEq(u.user(), alice, "user mismatch");
        assertEq(u.bigSponsor(), bob, "bigSponsor mismatch");
        assertEq(u.smallSponsor(), address(0), "smallSponsor should be zero");
    }

    function testConstructorInitializesBigAndSmallSponsor() public {
        User u = new User(alice, bob, carol);

        assertEq(u.user(), alice, "user mismatch");
        assertEq(u.bigSponsor(), bob, "bigSponsor mismatch");
        assertEq(u.smallSponsor(), carol, "smallSponsor mismatch");
    }

    function testConstructorRevertsWhenUserZero() public {
        vm.expectRevert(bytes("user = zero"));
        new User(address(0), address(0), address(0));
    }

    function testConstructorRevertsWhenSmallSponsorWithoutBig() public {
        vm.expectRevert(bytes("small sponsor requires big sponsor"));
        new User(alice, address(0), carol);
    }

    function testConstructorRevertsWhenUserIsBigSponsor() public {
        vm.expectRevert(bytes("user cannot be big sponsor of self"));
        new User(alice, alice, address(0));
    }

    function testConstructorRevertsWhenUserIsSmallSponsor() public {
        vm.expectRevert(bytes("user cannot be small sponsor of self"));
        new User(alice, bob, alice);
    }

    // ------------------------------------------------------------------------
    // getSponsors tests
    // ------------------------------------------------------------------------

    function testGetSponsorsNoSponsors() public {
        User u = new User(alice, address(0), address(0));

        (address big, address small) = u.getSponsors();
        assertEq(big, address(0), "bigSponsor should be zero");
        assertEq(small, address(0), "smallSponsor should be zero");
    }

    function testGetSponsorsBigOnly() public {
        User u = new User(alice, bob, address(0));

        (address big, address small) = u.getSponsors();
        assertEq(big, bob, "bigSponsor mismatch");
        assertEq(small, address(0), "smallSponsor should be zero");
    }

    function testGetSponsorsBigAndSmall() public {
        User u = new User(alice, bob, carol);

        (address big, address small) = u.getSponsors();
        assertEq(big, bob, "bigSponsor mismatch");
        assertEq(small, carol, "smallSponsor mismatch");
    }

    // ------------------------------------------------------------------------
    // getPayoutList tests
    // ------------------------------------------------------------------------

    function testGetPayoutListNoSponsors() public {
        User u = new User(alice, address(0), address(0));

        uint256 amount = 1_000 ether;

        (
            address userAddr,
            uint256 userAmount,
            address bigSponsorAddr,
            uint256 bigAmount,
            address smallSponsorAddr,
            uint256 smallAmount
        ) = u.getPayoutList(amount);

        assertEq(userAddr, alice, "userAddr mismatch");
        assertEq(userAmount, amount, "userAmount should be full amount");
        assertEq(bigSponsorAddr, address(0), "bigSponsorAddr should be zero");
        assertEq(bigAmount, 0, "bigAmount should be 0");
        assertEq(smallSponsorAddr, address(0), "smallSponsorAddr should be zero");
        assertEq(smallAmount, 0, "smallAmount should be 0");
    }

    function testGetPayoutListBigSponsorOnly() public {
        User u = new User(alice, bob, address(0));

        uint256 amount = 1_000 ether;

        (
            address userAddr,
            uint256 userAmount,
            address bigSponsorAddr,
            uint256 bigAmount,
            address smallSponsorAddr,
            uint256 smallAmount
        ) = u.getPayoutList(amount);

        // 10% to big sponsor, 90% to user
        uint256 expectedBig = (amount * 10) / 100;
        uint256 expectedUser = amount - expectedBig;

        assertEq(userAddr, alice, "userAddr mismatch");
        assertEq(bigSponsorAddr, bob, "bigSponsorAddr mismatch");
        assertEq(smallSponsorAddr, address(0), "smallSponsorAddr should be zero");

        assertEq(bigAmount, expectedBig, "bigAmount mismatch");
        assertEq(userAmount, expectedUser, "userAmount mismatch");
        assertEq(smallAmount, 0, "smallAmount should be 0");
    }

    function testGetPayoutListBigAndSmallSponsor() public {
        User u = new User(alice, bob, carol);

        uint256 amount = 1_000 ether;

        (
            address userAddr,
            uint256 userAmount,
            address bigSponsorAddr,
            uint256 bigAmount,
            address smallSponsorAddr,
            uint256 smallAmount
        ) = u.getPayoutList(amount);

        // 10% to big, 5% to small, 85% to user
        uint256 expectedBig = (amount * 10) / 100;
        uint256 expectedSmall = (amount * 5) / 100;
        uint256 expectedUser = amount - expectedBig - expectedSmall;

        assertEq(userAddr, alice, "userAddr mismatch");
        assertEq(bigSponsorAddr, bob, "bigSponsorAddr mismatch");
        assertEq(smallSponsorAddr, carol, "smallSponsorAddr mismatch");

        assertEq(bigAmount, expectedBig, "bigAmount mismatch");
        assertEq(smallAmount, expectedSmall, "smallAmount mismatch");
        assertEq(userAmount, expectedUser, "userAmount mismatch");
    }

    function testGetPayoutListRoundingGoesToUser() public {
        // Use a value that doesn't divide nicely by 20 (since 10% + 5% = 15%).
        User u = new User(alice, bob, carol);

        uint256 amount = 101; // tiny to make reasoning easy

        (
            address userAddr,
            uint256 userAmount,
            address bigSponsorAddr,
            uint256 bigAmount,
            address smallSponsorAddr,
            uint256 smallAmount
        ) = u.getPayoutList(amount);

        // Expected:
        // big = floor(101 * 10 / 100) = 10
        // small = floor(101 * 5 / 100) = 5
        // user = 101 - 10 - 5 = 86
        uint256 expectedBig = 10;
        uint256 expectedSmall = 5;
        uint256 expectedUser = 86;

        assertEq(userAddr, alice, "userAddr mismatch");
        assertEq(bigSponsorAddr, bob, "bigSponsorAddr mismatch");
        assertEq(smallSponsorAddr, carol, "smallSponsorAddr mismatch");

        assertEq(bigAmount, expectedBig, "bigAmount mismatch");
        assertEq(smallAmount, expectedSmall, "smallAmount mismatch");
        assertEq(userAmount, expectedUser, "userAmount should receive rounding dust");
        assertEq(userAmount + bigAmount + smallAmount, amount, "sum must equal total");
    }
}
