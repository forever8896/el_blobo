// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

import { ProjectRegistry } from "../src/ProjectRegistry.sol";
import { NativeRewardVault } from "../src/NativeRewardVault.sol";
import { IRewardVault } from "../src/IRewardVault.sol";
import { Main } from "../src/Main.sol";
import { Users } from "../src/Users.sol";

contract DeployMainNative is Script {
    function run() external {
        // ---------------------------------------------------------------------
        // Load env vars from .env
        // ---------------------------------------------------------------------
        uint256 deployerPk        = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer          = vm.envAddress("DEPLOYER_ADDRESS");
        address registryOwner     = vm.envAddress("REGISTRY_OWNER");
        address vaultOwner        = vm.envAddress("VAULT_OWNER");
        uint256 registrationPrice = vm.envUint("REGISTRATION_PRICE");

        vm.startBroadcast(deployerPk);

        // ---------------------------------------------------------------------
        // 1. Deploy ProjectRegistry
        // ---------------------------------------------------------------------
        ProjectRegistry registry = new ProjectRegistry(registryOwner);
        console2.log("ProjectRegistry deployed at:", address(registry));

        // Optional sanity check that registry owner is the deployer
        require(registryOwner == deployer, "REGISTRY_OWNER != DEPLOYER_ADDRESS");

        // ---------------------------------------------------------------------
        // 2. Deploy NativeRewardVault (no value sent to constructor)
        // ---------------------------------------------------------------------
        // NativeRewardVault constructor:
        //   constructor(address _vaultOwner, uint256 _registrationPrice)
        NativeRewardVault vault = new NativeRewardVault(
            vaultOwner,
            registrationPrice
        );

        console2.log("NativeRewardVault deployed at:", address(vault));

        // // Optionally pre-fund the vault with native token and mint shares
        // // This sends native token from `deployer` to the vault and mints shares
        // uint256 initialFunding = 1 ether;
        // if (initialFunding > 0) {
        //     vault.deposit{value: initialFunding}();
        //     console2.log("Vault initial funding (native):", initialFunding);
        // }

        console2.log("Vault native balance:", address(vault).balance);
        console2.log("Vault unallocatedShares:", vault.unallocatedShares());

        // ---------------------------------------------------------------------
        // 3. Deploy Users registry
        // ---------------------------------------------------------------------
        Users users = new Users();
        console2.log("Users registry deployed at:", address(users));

        // ---------------------------------------------------------------------
        // 4. Deploy Main
        // ---------------------------------------------------------------------
        // Main constructor:
        //   constructor(
        //       ProjectRegistry _projectRegistry,
        //       IRewardVault _vault,
        //       Users _users
        //   )
        Main main = new Main(
            registry,
            IRewardVault(address(vault)),
            users
        );

        console2.log("Main deployed at:", address(main));

        // ---------------------------------------------------------------------
        // 5. Summary
        // ---------------------------------------------------------------------
        console2.log("");
        console2.log("=== Deployment Summary ===");
        console2.log("Deployer:          ", deployer);
        console2.log("ProjectRegistry:   ", address(registry));
        console2.log("NativeRewardVault: ", address(vault));
        console2.log("Users:             ", address(users));
        console2.log("Main:              ", address(main));
        console2.log("Registration Price:", registrationPrice, "wei");
        console2.log("Vault Balance:     ", address(vault).balance, "wei");
        console2.log("Vault Unallocated: ", vault.unallocatedShares(), "shares");

        vm.stopBroadcast();
    }
}
