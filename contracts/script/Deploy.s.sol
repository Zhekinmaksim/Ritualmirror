// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {RitualMirrorRegistry} from "../src/RitualMirrorRegistry.sol";
import {RitualMirrorNFT} from "../src/RitualMirrorNFT.sol";
import {RitualMirrorSovereignConsumer} from "../src/RitualMirrorSovereignConsumer.sol";
import {RitualMirrorAgentManager} from "../src/RitualMirrorAgentManager.sol";

interface Vm {
    function envUint(string calldata key) external returns (uint256 value);
    function envOr(string calldata key, address defaultValue) external returns (address value);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract Deploy {
    Vm private constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant RITUAL_SOVEREIGN_AGENT_FACTORY = 0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304;
    address private constant RITUAL_PERSISTENT_AGENT_FACTORY = 0xD4AA9D55215dc8149Af57605e70921Ea16b73591;

    RitualMirrorRegistry public registry;
    RitualMirrorNFT public nft;
    RitualMirrorSovereignConsumer public sovereignConsumer;
    RitualMirrorAgentManager public agentManager;

    event RitualMirrorDeployed(
        address indexed registry,
        address indexed nft,
        address indexed sovereignConsumer,
        address agentManager
    );
    event RitualFactoriesConfigured(address indexed sovereignFactory, address indexed persistentFactory);

    function run() external returns (
        RitualMirrorRegistry,
        RitualMirrorNFT,
        RitualMirrorSovereignConsumer,
        RitualMirrorAgentManager
    ) {
        uint256 privateKey = VM.envUint("PRIVATE_KEY");
        address sovereignFactory = VM.envOr("SOVEREIGN_AGENT_FACTORY_ADDRESS", RITUAL_SOVEREIGN_AGENT_FACTORY);
        address persistentFactory = VM.envOr("PERSISTENT_AGENT_FACTORY_ADDRESS", RITUAL_PERSISTENT_AGENT_FACTORY);

        VM.startBroadcast(privateKey);
        (RitualMirrorRegistry deployedRegistry, RitualMirrorNFT deployedNft, RitualMirrorSovereignConsumer deployedConsumer, RitualMirrorAgentManager deployedManager) = _deploy();
        deployedConsumer.setSovereignFactory(sovereignFactory);
        deployedManager.setPersistentAgentFactory(persistentFactory);
        emit RitualFactoriesConfigured(sovereignFactory, persistentFactory);
        VM.stopBroadcast();

        return (deployedRegistry, deployedNft, deployedConsumer, deployedManager);
    }

    function deploy() external returns (
        RitualMirrorRegistry,
        RitualMirrorNFT,
        RitualMirrorSovereignConsumer,
        RitualMirrorAgentManager
    ) {
        return _deploy();
    }

    function _deploy() internal returns (
        RitualMirrorRegistry,
        RitualMirrorNFT,
        RitualMirrorSovereignConsumer,
        RitualMirrorAgentManager
    ) {
        registry = new RitualMirrorRegistry();
        nft = new RitualMirrorNFT(registry);
        sovereignConsumer = new RitualMirrorSovereignConsumer(registry);
        agentManager = new RitualMirrorAgentManager(registry);
        registry.setLifecycleContracts(address(sovereignConsumer), address(agentManager), address(nft));
        emit RitualMirrorDeployed(address(registry), address(nft), address(sovereignConsumer), address(agentManager));
        return (registry, nft, sovereignConsumer, agentManager);
    }
}
