// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {MoltScore} from "../src/MoltScore.sol";

contract DeployScore is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        new MoltScore(
            0x60abefF5aF36D37B97bD4b42f443945bdf27C499,
            0x39867261A469f03363157058D14Ec4E29758ebCC,
            0xb98BD32170C993B3d12333f43467d7F3FCC56BFA
        );
        vm.stopBroadcast();
    }
}
