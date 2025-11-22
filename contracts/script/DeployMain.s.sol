// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ProjectRegistry } from "../src/ProjectRegistry.sol";
import { RewardVault } from "../src/RewardVault.sol";
import { IRewardVault } from "../src/IRewardVault.sol";
import { Main } from "../src/Main.sol";

contract DeployMain is Script {
    function run() external {
        // ---------------------------------------------------------------------
        // Load env vars from .env
        // Foundry auto-loads .env at project root.
        // ---------------------------------------------------------------------
        uint256 deployerPk        = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer          = vm.envAddress("DEPLOYER_ADDRESS");
        address registryOwner     = vm.envAddress("REGISTRY_OWNER");
        address vaultOwner        = vm.envAddress("VAULT_OWNER");
        address usdc              = vm.envAddress("USDC_ADDRESS");
        uint256 registrationPrice = vm.envUint("REGISTRATION_PRICE");

        vm.startBroadcast(deployerPk);

        // ---------------------------------------------------------------------
        // 1. Deploy ProjectRegistry
        // ---------------------------------------------------------------------
        // If ProjectRegistry has different constructor args, adjust here.
        ProjectRegistry registry = new ProjectRegistry(registryOwner);

        // Optional sanity check
        require(registryOwner == deployer, "REGISTRY_OWNER != DEPLOYER_ADDRESS");

        // ---------------------------------------------------------------------
        // 2. Deploy RewardVault
        // ---------------------------------------------------------------------
        // RewardVault constructor:
        //   constructor(ERC20 _asset, address _vaultOwner, uint256 _registrationPrice)
        RewardVault vault = new RewardVault(
            ERC20(usdc),
            vaultOwner,
            registrationPrice
        );

        // ---------------------------------------------------------------------
        // 3. Deploy Main
        // ---------------------------------------------------------------------
        // Main constructor:
        //   constructor(ProjectRegistry _projectRegistry, IRewardVault _vault)
        //
        // We cast the RewardVault to IRewardVault explicitly:
        Main main = new Main(registry, IRewardVault(address(vault)));

        // ---------------------------------------------------------------------
        // 4. Log addresses to console
        // ---------------------------------------------------------------------
        console2.log("Deployer:          ", deployer);
        console2.log("USDC (underlying): ", usdc);
        console2.log("ProjectRegistry:   ", address(registry));
        console2.log("RewardVault:       ", address(vault));
        console2.log("Main:              ", address(main));

        vm.stopBroadcast();
    }
}
