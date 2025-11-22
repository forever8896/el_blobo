// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing on Ronin Saigon testnet
 * @dev This is ONLY for testing. Do NOT use in production.
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;

    constructor() ERC20("Mock USD Coin", "USDC") Ownable(msg.sender) {
        // Mint 10 million USDC to deployer for initial liquidity
        _mint(msg.sender, 10_000_000 * 10**DECIMALS);
    }

    /**
     * @notice Returns 6 decimals to match real USDC
     */
    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Mint new tokens (for testing purposes)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in smallest unit, 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @notice Faucet function - anyone can mint 1000 USDC once per day
     * @dev Useful for users to get test USDC without admin intervention
     */
    mapping(address => uint256) public lastMint;
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**DECIMALS; // 1000 USDC
    uint256 public constant FAUCET_COOLDOWN = 1 days;

    function faucet() external {
        require(
            block.timestamp >= lastMint[msg.sender] + FAUCET_COOLDOWN,
            "MockUSDC: Faucet cooldown not elapsed"
        );

        lastMint[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /**
     * @notice Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
