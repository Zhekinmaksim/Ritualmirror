// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {RitualMirrorRegistry} from "../src/RitualMirrorRegistry.sol";
import {RitualMirrorNFT} from "../src/RitualMirrorNFT.sol";
import {RitualMirrorSovereignConsumer} from "../src/RitualMirrorSovereignConsumer.sol";
import {RitualMirrorAgentManager} from "../src/RitualMirrorAgentManager.sol";

contract RitualMirrorLifecycleTest {
    RitualMirrorRegistry registry;
    RitualMirrorNFT nft;
    RitualMirrorSovereignConsumer consumer;
    RitualMirrorAgentManager manager;

    function setUp() public {
        registry = new RitualMirrorRegistry();
        nft = new RitualMirrorNFT(registry);
        consumer = new RitualMirrorSovereignConsumer(registry);
        manager = new RitualMirrorAgentManager(registry);
        registry.setLifecycleContracts(address(consumer), address(manager), address(nft));
    }

    function testCreateGenesisSpawnAndMint() public {
        bytes32 initialHash = keccak256("initial profile");
        registry.createMirror(initialHash, "ipfs://initial");

        bytes32 jobId = consumer.launchGenesis(bytes("identity input"));
        bytes32 profileHash = keccak256("profile");
        consumer.onSovereignAgentResult(jobId, profileHash, "https://ritualmirror.xyz/api/metadata/me", "hf://workspace/me");

        RitualMirrorRegistry.MirrorProfile memory mirror = registry.getMirror(address(this));
        require(mirror.profileHash == profileHash, "profile hash mismatch");
        require(mirror.genesisJobId == jobId, "job mismatch");
        require(mirror.version == 2, "version mismatch");

        manager.requestSpawn("hf://workspace/me", keccak256("config"));
        manager.recordSpawnedAgent(address(this), address(0xBEEF), "hf://workspace/me");

        mirror = registry.getMirror(address(this));
        require(mirror.persistentAgentLauncher == address(0xBEEF), "launcher mismatch");

        uint256 tokenId = nft.mintMirror(address(this), "https://ritualmirror.xyz/api/metadata/me");
        require(tokenId == 1, "token id mismatch");
        require(nft.mirrorOf(address(this)) == 1, "mirror token mismatch");
    }

    function testOwnerCanBridgeFactoryBackedLifecycle() public {
        bytes32 initialHash = keccak256("initial profile");
        registry.createMirror(initialHash, "ipfs://initial");

        consumer.recordGenesisFromOperator(
            address(this),
            bytes32(uint256(123)),
            keccak256("factory profile"),
            "https://ritualmirror.xyz/api/metadata/factory",
            "hf://workspace/factory"
        );

        RitualMirrorRegistry.MirrorProfile memory mirror = registry.getMirror(address(this));
        require(mirror.genesisJobId == bytes32(uint256(123)), "factory job mismatch");

        manager.recordSpawnedAgent(address(this), address(0xCAFE), "hf://workspace/factory");
        mirror = registry.getMirror(address(this));
        require(mirror.persistentAgentLauncher == address(0xCAFE), "factory launcher mismatch");
    }
}
