// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RewardVault.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("MockToken", "MTK") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract RewardVaultTest is Test {
    MockERC20 internal asset;
    RewardVault internal vault;

    address internal vaultOwner;   // also owner() in RewardVault
    address internal depositor;
    address internal user;

    uint256 constant REG_PRICE = 1e9; // 1 gwei worth of shares costs 1e9 asset units

    function setUp() public {
        asset = new MockERC20();

        vaultOwner = address(this);      // make test contract the vaultOwner/owner
        depositor  = address(0xD1CE);
        user       = address(0xBEEF);

        vault = new RewardVault(asset, vaultOwner, REG_PRICE);
    }

    // ------------------------------------------------------------------------
    // Constructor / initial state
    // ------------------------------------------------------------------------

    function testInitialState() public view {
        assertEq(vault.vaultOwner(), vaultOwner);
        assertEq(vault.owner(), vaultOwner);
        assertEq(vault.registrationPrice(), REG_PRICE);
        assertEq(vault.unallocatedShares(), 0);
        assertEq(vault.totalAllocatedShares(), 0);
    }

    // ------------------------------------------------------------------------
    // Price conversion
    // ------------------------------------------------------------------------

    function testConvertToSharesAndAssetsRoundTrip() public view {
        uint256 assets = 10 ether; // 1e19
        uint256 shares = vault.convertToShares(assets);

        // For REG_PRICE = 1e9 and SHARE_UNIT = 1e9, assets == shares
        assertEq(shares, assets);

        uint256 backToAssets = vault.convertToAssets(shares);
        assertEq(backToAssets, assets);
    }

    function testConvertToSharesZeroIfAssetsTooSmall() public view {
        uint256 assets = REG_PRICE - 1;
        uint256 shares = vault.convertToShares(assets);
        assertEq(shares, 0);
    }

    // ------------------------------------------------------------------------
    // Deposit
    // ------------------------------------------------------------------------

    function _depositFrom(address from, uint256 assets) internal returns (uint256 shares) {
        vm.prank(from);
        asset.mint(from, assets);

        vm.startPrank(from);
        asset.approve(address(vault), assets);
        shares = vault.deposit(assets);
        vm.stopPrank();
    }

    function testDepositMintsSharesToVaultOwnerAndUpdatesUnallocated() public {
        uint256 assets = 10 ether;

        uint256 shares = _depositFrom(depositor, assets);

        // ERC4626 totalAssets should reflect the deposit
        assertEq(vault.totalAssets(), assets);

        // Shares are minted to vaultOwner
        assertEq(vault.balanceOf(vaultOwner), shares);

        // With REG_PRICE = 1e9, assets == shares
        assertEq(shares, assets);

        // All minted shares are unallocated initially
        assertEq(vault.unallocatedShares(), shares);
        assertEq(vault.totalAllocatedShares(), 0);
    }

    function testDepositRevertsIfAssetsTooSmallForOneUnit() public {
        uint256 assets = REG_PRICE - 1; // yields 0 shares

        vm.prank(depositor);
        asset.mint(depositor, assets);

        vm.startPrank(depositor);
        asset.approve(address(vault), assets);
        vm.expectRevert("assets too small for 1 unit");
        vault.deposit(assets);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------------
    // setRegistrationPrice
    // ------------------------------------------------------------------------

    function testSetRegistrationPriceOnlyOwner() public {
        uint256 newPrice = 2e9;

        vault.setRegistrationPrice(newPrice);
        assertEq(vault.registrationPrice(), newPrice);
    }

    function testSetRegistrationPriceNonOwnerReverts() public {
        uint256 newPrice = 2e9;

        vm.prank(address(0x1234));
        vm.expectRevert("only owner");
        vault.setRegistrationPrice(newPrice);
    }

    function testSetRegistrationPriceMustBeNonZero() public {
        vm.expectRevert("price = 0");
        vault.setRegistrationPrice(0);
    }

    // ------------------------------------------------------------------------
    // transferShares
    // ------------------------------------------------------------------------

    function testTransferSharesHappyPath() public {
        uint256 assets = 10 ether;
        uint256 shares = _depositFrom(depositor, assets); // all to vaultOwner, unallocated

        assertEq(vault.unallocatedShares(), shares);
        assertEq(vault.totalAllocatedShares(), 0);
        assertEq(vault.userShares(user), 0);

        uint256 toTransfer = shares / 2;

        // Only vaultOwner can allocate
        vault.transferShares(toTransfer, user);

        assertEq(vault.unallocatedShares(), shares - toTransfer);
        assertEq(vault.totalAllocatedShares(), toTransfer);
        assertEq(vault.userShares(user), toTransfer);
    }

    function testTransferSharesOnlyVaultOwner() public {
        uint256 assets = 10 ether;
        _depositFrom(depositor, assets);

        vm.prank(address(0x1234));
        vm.expectRevert("only vaultOwner");
        vault.transferShares(1e18, user);
    }

    function testTransferSharesNotEnoughUnallocatedReverts() public {
        uint256 assets = 1 ether;
        uint256 shares = _depositFrom(depositor, assets);

        // Try to allocate more than unallocatedShares
        vm.expectRevert("not enough unallocated");
        vault.transferShares(shares + 1, user);
    }

    // ------------------------------------------------------------------------
    // withdraw
    // ------------------------------------------------------------------------

    function testWithdrawRevertsWhenNotEnoughEntitledShares() public {
        uint256 assets = 10 ether;
        uint256 shares = _depositFrom(depositor, assets);

        // Allocate all shares to user
        vault.transferShares(shares, user);

        // User tries to withdraw more than entitled
        vm.prank(user);
        vm.expectRevert("insufficient entitled shares");
        vault.withdraw(shares + 1, user);
    }

    function testWithdrawHappyPath() public {
        uint256 assets = 10 ether;
        uint256 shares = _depositFrom(depositor, assets);

        // Allocate all shares to user
        vault.transferShares(shares, user);

        // Allow user to redeem vaultOwner's ERC4626 shares
        vm.prank(vaultOwner);
        vault.approve(user, shares);

        uint256 userBalanceBefore = asset.balanceOf(user);

        vm.prank(user);
        uint256 withdrawn = vault.withdraw(shares, user);

        uint256 userBalanceAfter = asset.balanceOf(user);

        // All shares burned from entitlement
        assertEq(vault.userShares(user), 0);
        assertEq(vault.totalAllocatedShares(), 0);

        // Underlying was sent to user
        assertEq(withdrawn, assets);
        assertEq(userBalanceAfter - userBalanceBefore, assets);

        // Vault's totalAssets should be reduced
        assertEq(vault.totalAssets(), 0);
    }
}
