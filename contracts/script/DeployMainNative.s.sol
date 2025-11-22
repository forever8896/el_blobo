// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

import { ProjectRegistry } from "../src/ProjectRegistry.sol";
import { NativeRewardVault } from "../src/NativeRewardVault.sol";
import { Main } from "../src/Main.sol";

contract DeployMainNative is Script {
    function run() external {
        // ---------------------------------------------------------------------
        // Load env vars from .env
        // ---------------------------------------------------------------------
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address registryOwner = vm.envAddress("REGISTRY_OWNER");
        address vaultOwner = vm.envAddress("VAULT_OWNER");
        uint256 registrationPrice = vm.envUint("REGISTRATION_PRICE");

        vm.startBroadcast(deployerPk);

        // ---------------------------------------------------------------------
        // 1. Deploy ProjectRegistry
        // ---------------------------------------------------------------------
        ProjectRegistry registry = new ProjectRegistry(registryOwner);

        console2.log("ProjectRegistry deployed at:", address(registry));

        // ---------------------------------------------------------------------
        // 2. Deploy NativeRewardVault with initial funding
        // ---------------------------------------------------------------------
        // Send 1 RON as initial vault funding
        NativeRewardVault vault = new NativeRewardVault{value: 1 ether}(registrationPrice);

        console2.log("NativeRewardVault deployed at:", address(vault));
        console2.log("Initial vault balance:", address(vault).balance);

        // ---------------------------------------------------------------------
        // 3. Deploy Main
        // ---------------------------------------------------------------------
        Main main = new Main(registry, vault);

        console2.log("Main deployed at:", address(main));

        // ---------------------------------------------------------------------
        // 4. Summary
        // ---------------------------------------------------------------------
        console2.log("");
        console2.log("=== Deployment Summary ===");
        console2.log("Deployer:          ", deployer);
        console2.log("ProjectRegistry:   ", address(registry));
        console2.log("NativeRewardVault: ", address(vault));
        console2.log("Main:              ", address(main));
        console2.log("Registration Price:", registrationPrice, "wei");
        console2.log("Vault Balance:     ", address(vault).balance, "wei");

        vm.stopBroadcast();
    }
}
