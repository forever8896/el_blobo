// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title User
/// @notice Represents a single user with optional big and small sponsors.
///         Can compute payout splits between the three.
contract User {
    /// @notice The main user address
    address public immutable user;

    /// @notice Optional big sponsor (can be address(0))
    address public immutable bigSponsor;

    /// @notice Optional small sponsor (can be address(0))
    /// @dev Invariant: smallSponsor != 0 => bigSponsor != 0
    address public immutable smallSponsor;

    /// @param _user         The user address
    /// @param _bigSponsor   Big sponsor address (or address(0) for none)
    /// @param _smallSponsor Small sponsor address (or address(0) for none)
    constructor(
        address _user,
        address _bigSponsor,
        address _smallSponsor
    ) {
        require(_user != address(0), "user = zero");

        // No small sponsor without big sponsor
        if (_smallSponsor != address(0)) {
            require(_bigSponsor != address(0), "small sponsor requires big sponsor");
        }

        // Optional: user cannot sponsor themselves
        require(_bigSponsor != _user, "user cannot be big sponsor of self");
        require(_smallSponsor != _user, "user cannot be small sponsor of self");

        user = _user;
        bigSponsor = _bigSponsor;
        smallSponsor = _smallSponsor;
    }

    /// @notice Return both sponsors
    /// @return big   Big sponsor address
    /// @return small Small sponsor address
    function getSponsors() external view returns (address big, address small) {
        return (bigSponsor, smallSponsor);
    }

    /// @notice Compute payout distribution for a given amount
    /// @dev Rules:
    ///      - If no sponsors: user gets 100%
    ///      - If big sponsor only: 10% to big, 90% to user
    ///      - If big + small sponsor: 10% to big, 5% to small, 85% to user
    ///      - There cannot be smallSponsor without bigSponsor (enforced in ctor)
    ///
    ///      Any rounding leftovers due to integer division go to the user.
    ///
    /// @param amount Total amount to distribute
    ///
    /// @return userAddr        User address
    /// @return userAmount      Amount for user
    /// @return bigSponsorAddr  Big sponsor address (0 if none)
    /// @return bigAmount       Amount for big sponsor
    /// @return smallSponsorAddr Small sponsor address (0 if none)
    /// @return smallAmount     Amount for small sponsor
    function getPayoutList(uint256 amount)
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
        userAddr = user;
        bigSponsorAddr = bigSponsor;
        smallSponsorAddr = smallSponsor;

        uint256 remaining = amount;

        // Big sponsor gets 10%
        if (bigSponsorAddr != address(0)) {
            bigAmount = (amount * 10) / 100;
            remaining -= bigAmount;
        }

        // Small sponsor gets 5%
        if (smallSponsorAddr != address(0)) {
            // Invariant enforced in constructor, but we check anyway
            require(bigSponsorAddr != address(0), "invalid: small sponsor without big");
            smallAmount = (amount * 5) / 100;
            remaining -= smallAmount;
        }

        // User gets the rest (including dust)
        userAmount = remaining;
    }
}
