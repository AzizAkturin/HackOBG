// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {WAB} from "../src/WAB.sol";

contract Deploy is Script {
    function run() external returns (WAB club) {
        address operator = vm.envAddress("OPERATOR_ADDRESS");

        vm.startBroadcast();
        club = new WAB();
        address treasury = vm.envOr("TREASURY_ADDRESS", club.owner());

        club.setWeightClass(0, _class(0.01 ether, 0.1 ether, 45));
        club.setWeightClass(1, _class(0.05 ether, 0.5 ether, 60));
        club.setWeightClass(2, _class(0.2 ether, 2 ether, 60));
        club.setOperator(operator);
        club.setTreasury(treasury);
        vm.stopBroadcast();

        console.log("WAB", address(club));
        console.log("owner", club.owner());
        console.log("operator", club.operator());
        console.log("treasury", club.treasury());
    }

    function _class(uint96 minBet, uint96 maxBet, uint32 voteDuration)
        private
        pure
        returns (WAB.WeightClass memory)
    {
        return WAB.WeightClass({
            minBet: minBet,
            maxBet: maxBet,
            rakeBps: 500,
            voteDuration: voteDuration,
            settleGrace: 300,
            active: true,
            configHash: bytes32(0)
        });
    }
}
