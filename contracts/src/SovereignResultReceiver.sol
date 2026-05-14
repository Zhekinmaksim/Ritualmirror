// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "./Ownable.sol";

contract SovereignResultReceiver is Ownable {
    address public constant ASYNC_DELIVERY = 0x5A16214fF555848411544b005f7Ac063742f39F6;

    bytes32 public lastJobId;
    bytes public lastResult;

    event SovereignAgentResultDelivered(bytes32 indexed jobId, bytes result);

    error NotAsyncDelivery();

    function onSovereignAgentResult(bytes32 jobId, bytes calldata result) external {
        if (msg.sender != ASYNC_DELIVERY) revert NotAsyncDelivery();

        lastJobId = jobId;
        lastResult = result;

        emit SovereignAgentResultDelivered(jobId, result);
    }
}
