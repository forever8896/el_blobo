// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC4626 } from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

/// @title RewardVault
/// @notice ERC4626-based reward vault where:
///         1) Only `vaultOwner` actually holds ERC4626 shares and underlying assets.
///         2) Users have an internal "share entitlement" tracked in `userShares`.
///         3) Owner can allocate those shares via `transferShares`.
///         4) Users can withdraw by burning their internal shares and receiving
///            the corresponding amount of the underlying ERC20 asset.
///         5) Economic price controlled by `registrationPrice`, with the unit being
///            1 gwei of shares (SHARE_UNIT).
contract RewardVault is ERC4626 {
    /// @notice Logical unit of shares corresponding to one "registration share"
    /// @dev 1 gwei = 1e9 base units of the ERC20 share token.
    uint256 public constant SHARE_UNIT = 1 gwei;

    /// @notice Address that holds all ERC4626 share tokens
    address public immutable vaultOwner;

    /// @notice Owner allowed to update registrationPrice (can be same as vaultOwner)
    address public owner;

    /// @notice Price per SHARE_UNIT (1 gwei of shares) in units of underlying asset
    /// @dev registrationPrice = assets / SHARE_UNIT
    uint256 public registrationPrice;

    /// @notice Internal user share entitlements (in vault share units)
    /// @dev These are NOT ERC20 balances, just accounting for rewards.
    mapping(address => uint256) public userShares;

    /// @notice Total shares that have been allocated to users (for accounting)
    uint256 public totalAllocatedShares;

    /// @notice Total shares that are still unallocated (held by owner but not assigned to users)
    uint256 public unallocatedShares;

    // ------------------------------------------------------------------------
    // Constructor & modifiers
    // ------------------------------------------------------------------------

    /// @param _asset            Underlying ERC20 asset of the vault
    /// @param _vaultOwner       Address that will hold all ERC4626 shares
    /// @param _registrationPrice Price per SHARE_UNIT (1 gwei of shares) in asset units
    constructor(ERC20 _asset, address _vaultOwner, uint256 _registrationPrice)
        ERC20(
            string(abi.encodePacked("RewardVault ", _asset.name())),
            string(abi.encodePacked("rv", _asset.symbol()))
        )
        ERC4626(_asset)
    {
        require(address(_asset) != address(0), "asset = zero");
        require(_vaultOwner != address(0), "owner = zero");
        require(_registrationPrice > 0, "price = 0");

        vaultOwner = _vaultOwner;
        owner = _vaultOwner;
        registrationPrice = _registrationPrice;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    /// @notice Transfer ownership to a new owner (single-step)
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "new owner = zero");
        owner = newOwner;
    }

    // ------------------------------------------------------------------------
    // Price logic – fixed registrationPrice per SHARE_UNIT (1 gwei of shares)
    // ------------------------------------------------------------------------

    /// @notice Convert assets to shares using fixed price per SHARE_UNIT
    /// @dev assets per SHARE_UNIT = registrationPrice
    function convertToShares(uint256 assets)
        public
        view
        override
        returns (uint256)
    {
        require(registrationPrice > 0, "price = 0");
        // How many SHARE_UNITs can we buy?
        uint256 units = assets / registrationPrice; // number of 1 gwei units
        return units * SHARE_UNIT;
    }

    /// @notice Convert shares to assets using fixed price per SHARE_UNIT
    function convertToAssets(uint256 shares)
        public
        view
        override
        returns (uint256)
    {
        // shares / SHARE_UNIT = how many "units" we have
        return (shares * registrationPrice) / SHARE_UNIT;
    }

    /// @notice Owner can update the registration price (per SHARE_UNIT)
    function setRegistrationPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "price = 0");
        registrationPrice = newPrice;
    }

    // ------------------------------------------------------------------------
    // ERC4626 overrides – deposits/mints always credit vaultOwner
    // ------------------------------------------------------------------------

    /// @notice Deposit `assets` into the vault.
    /// @dev All newly minted shares are credited to `vaultOwner` and tracked as unallocated.
    ///      Caller must have approved `assets` of the underlying ERC20 to this contract.
    function deposit(uint256 assets)
        public
        returns (uint256 shares)
    {
        // Expected shares at fixed price with 1 gwei units
        uint256 expectedShares = convertToShares(assets);
        require(expectedShares > 0, "assets too small for 1 unit");

        // We ignore `receiver` for ERC4626 balances: all shares go to vaultOwner
        shares = super.deposit(assets, vaultOwner);

        // Ensure ERC4626 minted what we expect under current price
        require(shares == expectedShares, "deposit: price mismatch");

        // Newly minted shares are initially unallocated in our reward accounting
        unallocatedShares += shares;
    }

    // ------------------------------------------------------------------------
    // Owner-facing API: allocate shares to users (internal accounting)
    // ------------------------------------------------------------------------

    /// @notice Allocate `shares` from the unallocated pool to a user
    /// @dev This does NOT move ERC20 balances, only internal accounting.
    ///      The underlying ERC4626 shares remain owned by `vaultOwner`.
    /// @param shares   Number of vault shares to allocate as user entitlement
    /// @param receiver User address that will receive these share entitlements
    function transferShares(uint256 shares, address receiver) external {
        require(msg.sender == vaultOwner, "only vaultOwner");
        require(receiver != address(0), "receiver = zero");
        require(shares > 0, "shares = 0");
        require(unallocatedShares >= shares, "not enough unallocated");

        unallocatedShares -= shares;
        totalAllocatedShares += shares;
        userShares[receiver] += shares;
    }

    // ------------------------------------------------------------------------
    // User-facing API: withdraw by burning internal shares
    // ------------------------------------------------------------------------

    /// @notice Withdraw by burning your internal share entitlements
    /// @dev Burns `shares` from `userShares[msg.sender]` and redeems the corresponding
    ///      amount of underlying tokens from the vault to `receiver`.
    ///      Internally calls ERC4626.redeem(..., receiver, vaultOwner).
    /// @param shares   Number of vault shares to burn from caller's entitlement
    /// @param receiver Address that receives the underlying asset tokens
    /// @return assets  Amount of underlying asset sent to `receiver`
    function withdraw(uint256 shares, address receiver)
        external
        returns (uint256 assets)
    {
        require(receiver != address(0), "receiver = zero");
        require(shares > 0, "shares = 0");
        require(userShares[msg.sender] >= shares, "insufficient entitled shares");

        // Update internal accounting
        userShares[msg.sender] -= shares;
        totalAllocatedShares -= shares;

        // Redeem from the vaultOwner's ERC4626 share balance to the receiver
        assets = redeem(shares, receiver, vaultOwner);
    }
}
