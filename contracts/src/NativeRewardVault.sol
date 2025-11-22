// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IRewardVault } from "./IRewardVault.sol";

/// @title NativeRewardVault
/// @notice Reward vault that holds and distributes native tokens (RON) instead of ERC20
/// @dev Simplified version without ERC4626 complexity
contract NativeRewardVault is IRewardVault {
    /// @notice Owner allowed to update registrationPrice
    address public owner;

    /// @notice Price for registration (in wei of native token)
    uint256 public registrationPrice;

    /// @notice Internal user share entitlements (in wei)
    mapping(address => uint256) public userShares;

    /// @notice Total shares that have been allocated to users
    uint256 public totalAllocatedShares;

    /// @notice Total shares available in the vault
    uint256 public totalShares;

    event SharesAllocated(address indexed user, uint256 shares);
    event SharesWithdrawn(address indexed user, uint256 shares, uint256 amount);
    event Deposited(address indexed from, uint256 amount);
    event RegistrationPriceUpdated(uint256 oldPrice, uint256 newPrice);

    constructor(uint256 _registrationPrice) payable {
        require(_registrationPrice > 0, "price = 0");
        owner = msg.sender;
        registrationPrice = _registrationPrice;
        totalShares = msg.value; // Initial deposit
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

    /// @notice Deposit native tokens into the vault
    receive() external payable {
        totalShares += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Convert asset amount to shares (1:1 for native tokens)
    function convertToShares(uint256 assets) public pure returns (uint256) {
        return assets; // 1:1 for native tokens
    }

    /// @notice Convert shares to assets (1:1 for native tokens)
    function convertToAssets(uint256 shares) public pure returns (uint256) {
        return shares; // 1:1 for native tokens
    }

    /// @notice Owner can update the registration price
    function setRegistrationPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "price = 0");
        uint256 oldPrice = registrationPrice;
        registrationPrice = newPrice;
        emit RegistrationPriceUpdated(oldPrice, newPrice);
    }

    /// @notice Get total unallocated shares
    function unallocatedShares() external view returns (uint256) {
        return totalShares - totalAllocatedShares;
    }

    /// @notice Get total assets in vault
    function totalAssets() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Allocate shares from the vault to a user
    /// @dev Only callable by Main contract (owner)
    /// @param shares   Number of shares (wei) to allocate
    /// @param receiver User address that will receive these share entitlements
    function transferShares(uint256 shares, address receiver) external onlyOwner {
        require(receiver != address(0), "receiver = zero");
        require(shares > 0, "shares = 0");
        require(totalShares >= totalAllocatedShares + shares, "insufficient shares");

        totalAllocatedShares += shares;
        userShares[receiver] += shares;

        emit SharesAllocated(receiver, shares);
    }

    /// @notice Withdraw native tokens by burning share entitlements
    /// @dev Burns shares from userShares[msg.sender] and sends native tokens
    /// @param shares   Number of shares to burn
    /// @param receiver Address that receives the native tokens
    /// @return amount  Amount of native tokens sent
    function withdraw(uint256 shares, address receiver) external returns (uint256 amount) {
        require(receiver != address(0), "receiver = zero");
        require(shares > 0, "shares = 0");
        require(userShares[msg.sender] >= shares, "insufficient shares");

        // Convert shares to native token amount (1:1)
        amount = convertToAssets(shares);
        require(address(this).balance >= amount, "insufficient balance");

        // Update internal accounting
        userShares[msg.sender] -= shares;
        totalAllocatedShares -= shares;
        totalShares -= shares;

        // Send native tokens
        (bool success, ) = payable(receiver).call{value: amount}("");
        require(success, "transfer failed");

        emit SharesWithdrawn(msg.sender, shares, amount);
    }
}
