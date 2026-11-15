// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {WAB} from "../src/WAB.sol";

contract Deploy is Script {
    function run() external returns (WAB wab) {
        address operator = vm.envAddress("OPERATOR_ADDRESS");
        // House bankroll sent by the deployer. Each match locks its class bankroll (1 MON) from it and
        // returns the surplus when the match ends, so 3 MON backs 3 matches at once.
        uint256 houseFund = vm.envOr("HOUSE_FUND", uint256(3 ether));

        vm.startBroadcast();
        wab = new WAB();
        address treasury = vm.envOr("TREASURY_ADDRESS", wab.owner());

        //                         minTrade     maxTrade    liquidity  tradeWindow vote
        wab.setWeightClass(0, _class(0.01 ether, 0.1 ether, 0.5 ether, 45, 45)); // Flyweight
        wab.setWeightClass(1, _class(0.05 ether, 0.3 ether, 1 ether, 60, 60)); // Middleweight
        wab.setWeightClass(2, _class(0.1 ether, 0.5 ether, 2 ether, 60, 60)); // Heavyweight
        wab.setOperator(operator);
        wab.setTreasury(treasury);
        if (houseFund > 0) wab.fundHouse{value: houseFund}();
        vm.stopBroadcast();

        console.log("WAB", address(wab));
        console.log("owner", wab.owner());
        console.log("operator", wab.operator());
        console.log("treasury", wab.treasury());
        console.log("house (wei)", wab.houseBalance());
    }

    function _class(uint96 minTrade, uint96 maxTrade, uint96 liquidity, uint32 tradeWindow, uint32 voteDuration)
        private
        pure
        returns (WAB.WeightClass memory)
    {
        return WAB.WeightClass({
            minTrade: minTrade,
            maxTrade: maxTrade,
            bankroll: 1 ether,
            liquidity: liquidity,
            feeBps: 200,
            tradeWindow: tradeWindow,
            voteDuration: voteDuration,
            settleGrace: 300,
            active: true,
            configHash: bytes32(0)
        });
    }
}
