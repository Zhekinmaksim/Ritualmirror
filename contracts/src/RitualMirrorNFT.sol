// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "./Ownable.sol";
import {RitualMirrorRegistry} from "./RitualMirrorRegistry.sol";

contract RitualMirrorNFT is Ownable {
    string public name = "Ritual Mirror";
    string public symbol = "MIRROR";
    uint256 public nextTokenId = 1;
    RitualMirrorRegistry public registry;

    mapping(uint256 => address) private owners;
    mapping(address => uint256) private balances;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    mapping(uint256 => string) private tokenUris;
    mapping(address => uint256) public mirrorOf;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed spender, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event MirrorMinted(address indexed user, uint256 tokenId, string tokenURI);

    error NotTokenOwner();
    error NotApproved();
    error InvalidRecipient();
    error MirrorRequired();
    error MirrorAlreadyMinted();
    error UnknownToken();

    constructor(RitualMirrorRegistry _registry) {
        registry = _registry;
    }

    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) revert InvalidRecipient();
        return balances[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = owners[tokenId];
        if (tokenOwner == address(0)) revert UnknownToken();
        return tokenOwner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (owners[tokenId] == address(0)) revert UnknownToken();
        return tokenUris[tokenId];
    }

    function approve(address spender, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        if (msg.sender != tokenOwner && !isApprovedForAll[tokenOwner][msg.sender]) revert NotApproved();
        getApproved[tokenId] = spender;
        emit Approval(tokenOwner, spender, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        if (to == address(0)) revert InvalidRecipient();
        address tokenOwner = ownerOf(tokenId);
        if (tokenOwner != from) revert NotTokenOwner();
        if (msg.sender != tokenOwner && msg.sender != getApproved[tokenId] && !isApprovedForAll[tokenOwner][msg.sender]) {
            revert NotApproved();
        }

        balances[from] -= 1;
        balances[to] += 1;
        owners[tokenId] = to;
        delete getApproved[tokenId];

        emit Transfer(from, to, tokenId);
    }

    function mintMirror(address to, string calldata uri) external returns (uint256 tokenId) {
        if (to == address(0)) revert InvalidRecipient();
        if (!registry.hasMirror(to)) revert MirrorRequired();
        if (mirrorOf[to] != 0) revert MirrorAlreadyMinted();

        tokenId = nextTokenId++;
        owners[tokenId] = to;
        balances[to] = balances[to] + 1;
        tokenUris[tokenId] = uri;
        mirrorOf[to] = tokenId;
        registry.linkToken(to, tokenId);

        emit Transfer(address(0), to, tokenId);
        emit MirrorMinted(to, tokenId, uri);
    }
}
