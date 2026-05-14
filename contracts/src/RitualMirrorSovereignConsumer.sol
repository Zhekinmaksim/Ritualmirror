// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "./Ownable.sol";
import {RitualMirrorRegistry} from "./RitualMirrorRegistry.sol";

contract RitualMirrorSovereignConsumer is Ownable {
    RitualMirrorRegistry public registry;
    address public sovereignFactory;
    address public authorizedGenesisDeliverer;

    mapping(bytes32 => address) public jobOwner;

    event GenesisLaunched(address indexed user, bytes32 indexed jobId, bytes inputHash);
    event GenesisDelivered(address indexed user, bytes32 indexed jobId, bytes32 profileHash, string metadataURI);
    event GenesisRecordedByOperator(address indexed user, bytes32 indexed jobId, bytes32 profileHash, string metadataURI);
    event SovereignFactorySet(address indexed sovereignFactory);
    event AuthorizedGenesisDelivererSet(address indexed deliverer);

    error NotAuthorizedGenesisDeliverer();
    error UnknownJob();

    constructor(RitualMirrorRegistry _registry) {
        registry = _registry;
        authorizedGenesisDeliverer = msg.sender;
    }

    function setSovereignFactory(address _sovereignFactory) external onlyOwner {
        sovereignFactory = _sovereignFactory;
        emit SovereignFactorySet(_sovereignFactory);
    }

    function setAuthorizedGenesisDeliverer(address deliverer) external onlyOwner {
        authorizedGenesisDeliverer = deliverer;
        emit AuthorizedGenesisDelivererSet(deliverer);
    }

    function launchGenesis(bytes calldata encodedIdentityInput) external returns (bytes32 jobId) {
        jobId = keccak256(abi.encode(msg.sender, encodedIdentityInput, block.chainid, block.timestamp, block.number));
        jobOwner[jobId] = msg.sender;

        // VERIFY_REQUIRED: replace event-only prototype with Ritual SovereignAgentFactory job creation.
        emit GenesisLaunched(msg.sender, jobId, encodedIdentityInput);
    }

    function onSovereignAgentResult(bytes32 jobId, bytes32 profileHash, string calldata metadataURI, string calldata agentWorkspaceURI) external {
        if (msg.sender != authorizedGenesisDeliverer && msg.sender != sovereignFactory) revert NotAuthorizedGenesisDeliverer();
        address user = jobOwner[jobId];
        if (user == address(0)) revert UnknownJob();

        registry.setGenesisResult(user, jobId, profileHash, metadataURI, agentWorkspaceURI);
        emit GenesisDelivered(user, jobId, profileHash, metadataURI);
    }

    function recordGenesisFromOperator(
        address user,
        bytes32 jobId,
        bytes32 profileHash,
        string calldata metadataURI,
        string calldata agentWorkspaceURI
    ) external onlyOwner {
        registry.setGenesisResult(user, jobId, profileHash, metadataURI, agentWorkspaceURI);
        emit GenesisRecordedByOperator(user, jobId, profileHash, metadataURI);
    }
}
