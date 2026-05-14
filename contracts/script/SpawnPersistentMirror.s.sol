// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {RitualMirrorAgentManager} from "../src/RitualMirrorAgentManager.sol";

contract SpawnPersistentMirror {
    function encodeSpawn(string calldata workspaceURI, bytes32 configHash) external pure returns (bytes memory) {
        return abi.encodeCall(RitualMirrorAgentManager.requestSpawn, (workspaceURI, configHash));
    }
}
