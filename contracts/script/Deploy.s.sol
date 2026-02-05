// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MoltProfile.sol";
import "../src/MoltReview.sol";
import "../src/MoltVouch.sol";
import "../src/MoltSlash.sol";
import "../src/MoltScore.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy in order
        MoltProfile profile = new MoltProfile();
        console.log("MoltProfile:", address(profile));

        MoltReview review = new MoltReview(address(profile));
        console.log("MoltReview:", address(review));

        MoltVouch vouch = new MoltVouch(address(profile));
        console.log("MoltVouch:", address(vouch));

        MoltSlash slash = new MoltSlash(address(profile));
        console.log("MoltSlash:", address(slash));

        MoltScore score = new MoltScore(address(profile));
        console.log("MoltScore:", address(score));

        // Link contracts
        slash.setVouchContract(address(vouch));
        score.setContracts(address(review), address(vouch), address(slash));

        vm.stopBroadcast();

        console.log("\n=== Deployment Complete ===");
        console.log("Update SKILL.md with these addresses");
    }
}
