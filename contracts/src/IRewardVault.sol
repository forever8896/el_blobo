// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IRewardVault
/// @notice Interface for reward vaults (both ERC20 and native token versions)
interface IRewardVault {
    function registrationPrice() external view returns (uint256);
    function setRegistrationPrice(uint256 newPrice) external;
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function unallocatedShares() external view returns (uint256);
    function transferShares(uint256 shares, address receiver) external;
    function owner() external view returns (address);
    function transferOwnership(address newOwner) external;
}
