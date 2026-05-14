// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "./Ownable.sol";

contract RitualMirrorRegistry is Ownable {
    struct MirrorProfile {
        address owner;
        bytes32 profileHash;
        string metadataURI;
        string agentWorkspaceURI;
        address persistentAgentLauncher;
        bytes32 genesisJobId;
        uint256 createdAt;
        uint256 version;
        bool active;
    }

    mapping(address => MirrorProfile) private mirrors;
    mapping(uint256 => address) public tokenOwner;

    address public sovereignConsumer;
    address public agentManager;
    address public mirrorNft;

    event MirrorCreated(address indexed user, bytes32 profileHash, string metadataURI);
    event MirrorUpdated(address indexed user, bytes32 profileHash, string metadataURI, uint256 version);
    event GenesisLinked(address indexed user, bytes32 indexed genesisJobId, string agentWorkspaceURI);
    event PersistentAgentSet(address indexed user, address indexed launcher, string agentWorkspaceURI);
    event MirrorTokenLinked(address indexed user, uint256 indexed tokenId);
    event LifecycleContractSet(bytes32 indexed role, address indexed target);

    error MirrorExists();
    error MirrorMissing();
    error NotMirrorOwner();
    error NotAuthorizedLifecycleContract();
    error EmptyMetadataURI();

    modifier onlyLifecycleContract() {
        if (msg.sender != sovereignConsumer && msg.sender != agentManager && msg.sender != mirrorNft) {
            revert NotAuthorizedLifecycleContract();
        }
        _;
    }

    function setLifecycleContracts(address _sovereignConsumer, address _agentManager, address _mirrorNft) external onlyOwner {
        sovereignConsumer = _sovereignConsumer;
        agentManager = _agentManager;
        mirrorNft = _mirrorNft;
        emit LifecycleContractSet("SOVEREIGN_CONSUMER", _sovereignConsumer);
        emit LifecycleContractSet("AGENT_MANAGER", _agentManager);
        emit LifecycleContractSet("MIRROR_NFT", _mirrorNft);
    }

    function createMirror(bytes32 profileHash, string calldata metadataURI) external {
        if (mirrors[msg.sender].createdAt != 0) revert MirrorExists();
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();

        mirrors[msg.sender] = MirrorProfile({
            owner: msg.sender,
            profileHash: profileHash,
            metadataURI: metadataURI,
            agentWorkspaceURI: "",
            persistentAgentLauncher: address(0),
            genesisJobId: bytes32(0),
            createdAt: block.timestamp,
            version: 1,
            active: true
        });

        emit MirrorCreated(msg.sender, profileHash, metadataURI);
    }

    function updateMirror(bytes32 profileHash, string calldata metadataURI) external {
        MirrorProfile storage mirror = mirrors[msg.sender];
        if (mirror.createdAt == 0) revert MirrorMissing();
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();

        mirror.profileHash = profileHash;
        mirror.metadataURI = metadataURI;
        mirror.version += 1;

        emit MirrorUpdated(msg.sender, profileHash, metadataURI, mirror.version);
    }

    function setGenesisResult(address user, bytes32 genesisJobId, bytes32 profileHash, string calldata metadataURI, string calldata agentWorkspaceURI)
        external
        onlyLifecycleContract
    {
        MirrorProfile storage mirror = mirrors[user];
        if (mirror.createdAt == 0) revert MirrorMissing();

        mirror.genesisJobId = genesisJobId;
        mirror.profileHash = profileHash;
        mirror.metadataURI = metadataURI;
        mirror.agentWorkspaceURI = agentWorkspaceURI;
        mirror.version += 1;

        emit GenesisLinked(user, genesisJobId, agentWorkspaceURI);
        emit MirrorUpdated(user, profileHash, metadataURI, mirror.version);
    }

    function setPersistentAgent(address user, address launcher, string calldata agentWorkspaceURI) external onlyLifecycleContract {
        MirrorProfile storage mirror = mirrors[user];
        if (mirror.createdAt == 0) revert MirrorMissing();

        mirror.persistentAgentLauncher = launcher;
        mirror.agentWorkspaceURI = agentWorkspaceURI;

        emit PersistentAgentSet(user, launcher, agentWorkspaceURI);
    }

    function linkToken(address user, uint256 tokenId) external onlyLifecycleContract {
        if (mirrors[user].createdAt == 0) revert MirrorMissing();
        tokenOwner[tokenId] = user;
        emit MirrorTokenLinked(user, tokenId);
    }

    function getMirror(address user) external view returns (MirrorProfile memory) {
        return mirrors[user];
    }

    function hasMirror(address user) external view returns (bool) {
        return mirrors[user].createdAt != 0 && mirrors[user].active;
    }
}
