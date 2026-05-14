// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "./Ownable.sol";
import {RitualMirrorRegistry} from "./RitualMirrorRegistry.sol";

contract RitualMirrorAgentManager is Ownable {
    enum AgentStatus {
        None,
        Spawning,
        Online,
        Paused,
        Failed
    }

    struct AgentRecord {
        address launcher;
        string workspaceURI;
        AgentStatus status;
        uint256 updatedAt;
    }

    RitualMirrorRegistry public registry;
    address public persistentAgentFactory;
    mapping(address => AgentRecord) public agents;

    event PersistentAgentFactorySet(address indexed factory);
    event PersistentMirrorSpawnRequested(address indexed user, bytes32 indexed configHash, string workspaceURI);
    event PersistentMirrorAgentSet(address indexed user, address indexed launcher, string workspaceURI, AgentStatus status);
    event PersistentMirrorStatusSet(address indexed user, AgentStatus status);
    event PersistentMirrorAgentRecordedByOperator(address indexed user, address indexed launcher, string workspaceURI, AgentStatus status);

    error NotFactory();
    error EmptyWorkspaceURI();

    constructor(RitualMirrorRegistry _registry) {
        registry = _registry;
    }

    function setPersistentAgentFactory(address factory) external onlyOwner {
        persistentAgentFactory = factory;
        emit PersistentAgentFactorySet(factory);
    }

    function requestSpawn(string calldata workspaceURI, bytes32 configHash) external {
        if (bytes(workspaceURI).length == 0) revert EmptyWorkspaceURI();

        agents[msg.sender] = AgentRecord({
            launcher: address(0),
            workspaceURI: workspaceURI,
            status: AgentStatus.Spawning,
            updatedAt: block.timestamp
        });

        // VERIFY_REQUIRED: replace event-only prototype with Ritual PersistentAgentFactory call.
        emit PersistentMirrorSpawnRequested(msg.sender, configHash, workspaceURI);
    }

    function recordSpawnedAgent(address user, address launcher, string calldata workspaceURI) external {
        if (persistentAgentFactory != address(0) && msg.sender != persistentAgentFactory && msg.sender != owner) revert NotFactory();

        agents[user] = AgentRecord({
            launcher: launcher,
            workspaceURI: workspaceURI,
            status: AgentStatus.Online,
            updatedAt: block.timestamp
        });

        registry.setPersistentAgent(user, launcher, workspaceURI);
        emit PersistentMirrorAgentSet(user, launcher, workspaceURI, AgentStatus.Online);
        if (msg.sender == owner) {
            emit PersistentMirrorAgentRecordedByOperator(user, launcher, workspaceURI, AgentStatus.Online);
        }
    }

    function setStatus(address user, AgentStatus status) external onlyOwner {
        agents[user].status = status;
        agents[user].updatedAt = block.timestamp;
        emit PersistentMirrorStatusSet(user, status);
    }
}
