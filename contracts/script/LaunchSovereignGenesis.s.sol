// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {RitualMirrorSovereignConsumer} from "../src/RitualMirrorSovereignConsumer.sol";

contract LaunchSovereignGenesis {
    function encodeLaunch(bytes calldata encodedIdentityInput) external pure returns (bytes memory) {
        return abi.encodeCall(RitualMirrorSovereignConsumer.launchGenesis, (encodedIdentityInput));
    }
}
