// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { User } from "./User.sol";

/// @title Users
/// @notice Registry that maintains all registered users and their `User` contracts.
///         Provides isUser + getSponsors and a register function that deploys `User`.
contract Users {
    /// @notice Mapping from main user address to its User contract
    mapping(address => User) public userContracts;

    event UserRegistered(
        address indexed user,
        address indexed userContract,
        address indexed bigSponsor,
        address smallSponsor
    );

    /// @notice Register msg.sender as a new user and deploy a `User` contract for them
    /// @param bigSponsor   Address of big sponsor (or 0 for none)
    /// @param smallSponsor Address of small sponsor (or 0 for none)
    function register(address userAddr, address bigSponsor, address smallSponsor) external {
        require(address(userContracts[userAddr]) == address(0), "user already registered");

        // No small sponsor without big sponsor
        if (smallSponsor != address(0)) {
            require(bigSponsor != address(0), "small sponsor requires big sponsor");
        }

        // Optional: no self sponsorship
        require(bigSponsor != userAddr, "self big sponsor not allowed");
        require(smallSponsor != userAddr, "self small sponsor not allowed");

        // Deploy dedicated User contract
        User u = new User(userAddr, bigSponsor, smallSponsor);

        userContracts[userAddr] = u;

        emit UserRegistered(userAddr, address(u), bigSponsor, smallSponsor);
    }

    /// @notice Check if an address is a registered user
    function isUser(address account) external view returns (bool) {
        return address(userContracts[account]) != address(0);
    }

    /// @notice Get sponsors for a user (reads from their User contract)
    /// @param account   The user address
    /// @return big      Big sponsor
    /// @return small    Small sponsor
    function getSponsors(address account)
        external
        view
        returns (address big, address small)
    {
        User u = userContracts[account];
        require(address(u) != address(0), "user not registered");
        return u.getSponsors();
    }

    /// @notice Evaluate payout for a given user and amount by delegating to User.getPayoutList
    /// @param account The user address
    /// @param amount  Total amount to distribute
    ///
    /// @return userAddr        User address
    /// @return userAmount      Amount for user
    /// @return bigSponsorAddr  Big sponsor address (0 if none)
    /// @return bigAmount       Amount for big sponsor
    /// @return smallSponsorAddr Small sponsor address (0 if none)
    /// @return smallAmount     Amount for small sponsor
    function evaluatePayout(address account, uint256 amount)
        external
        view
        returns (
            address userAddr,
            uint256 userAmount,
            address bigSponsorAddr,
            uint256 bigAmount,
            address smallSponsorAddr,
            uint256 smallAmount
        )
    {
        User u = userContracts[account];
        require(address(u) != address(0), "user not registered");

        return u.getPayoutList(amount);
    }
}
