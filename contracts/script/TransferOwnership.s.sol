// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Main.sol";
import "../src/ProjectRegistry.sol";
import "../src/RewardVault.sol";

/**
 * @title TransferOwnership
 * @notice Script to transfer ownership of all deployed contracts to the Coinbase server wallet
 * @dev Usage:
 *      forge script script/TransferOwnership.s.sol:TransferOwnership \
 *        --rpc-url $RPC_URL \
 *        --private-key $DEPLOYER_PRIVATE_KEY \
 *        --broadcast
 */
contract TransferOwnership is Script {
    // Target owner (Coinbase server wallet)
    address constant NEW_OWNER = 0xb7cDCd1a98bD3Ed1FeBc396128B15a917Bb44AAe;

    function run() external {
        // Load deployed contract addresses from environment
        address mainAddress = vm.envAddress("MAIN_ADDRESS");
        address registryAddress = vm.envAddress("REGISTRY_ADDRESS");
        address vaultAddress = vm.envAddress("VAULT_ADDRESS");

        console.log("=== Transferring Ownership ===");
        console.log("New Owner:", NEW_OWNER);
        console.log("");

        vm.startBroadcast();

        // Transfer Main contract ownership
        Main main = Main(mainAddress);
        console.log("Main contract:", mainAddress);
        console.log("Current owner:", main.owner());
        main.transferOwnership(NEW_OWNER);
        console.log("Ownership transferred to:", NEW_OWNER);
        console.log("");

        // Transfer ProjectRegistry ownership
        ProjectRegistry registry = ProjectRegistry(registryAddress);
        console.log("ProjectRegistry contract:", registryAddress);
        console.log("Current owner:", registry.owner());
        registry.transferOwnership(NEW_OWNER);
        console.log("Ownership transferred to:", NEW_OWNER);
        console.log("");

        // Transfer RewardVault ownership
        RewardVault vault = RewardVault(vaultAddress);
        console.log("RewardVault contract:", vaultAddress);
        console.log("Current owner:", vault.owner());
        vault.transferOwnership(NEW_OWNER);
        console.log("Ownership transferred to:", NEW_OWNER);
        console.log("");

        vm.stopBroadcast();

        console.log("=== Ownership Transfer Complete ===");
        console.log("All contracts now owned by:", NEW_OWNER);
        console.log("");
        console.log("Ownership transferred successfully (single-step, no acceptance needed)!");
    }
}
