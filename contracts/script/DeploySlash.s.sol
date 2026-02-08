// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script} from "forge-std/Script.sol";
import {MoltSlash} from "../src/MoltSlash.sol";

contract DeploySlash is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        new MoltSlash(0x60abefF5aF36D37B97bD4b42f443945bdf27C499);
        vm.stopBroadcast();
    }
}
