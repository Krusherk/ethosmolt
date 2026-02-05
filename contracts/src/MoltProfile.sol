// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IMoltProfile.sol";

contract MoltProfile is IMoltProfile {
    struct Agent {
        bytes32 apiKeyHash;
        string name;
        address owner;
        uint256 registeredAt;
    }

    mapping(uint256 => Agent) public agents;
    mapping(bytes32 => uint256) public hashToAgentId;
    mapping(address => uint256[]) public ownerAgents;
    
    uint256 public totalAgents;

    event AgentRegistered(uint256 indexed agentId, bytes32 indexed apiKeyHash, string name, address owner);

    error AlreadyRegistered();
    error InvalidHash();
    error InvalidName();

    function registerAgent(bytes32 apiKeyHash, string calldata name) external returns (uint256) {
        if (apiKeyHash == bytes32(0)) revert InvalidHash();
        if (bytes(name).length == 0) revert InvalidName();
        if (hashToAgentId[apiKeyHash] != 0) revert AlreadyRegistered();

        totalAgents++;
        uint256 agentId = totalAgents;

        agents[agentId] = Agent({
            apiKeyHash: apiKeyHash,
            name: name,
            owner: msg.sender,
            registeredAt: block.timestamp
        });

        hashToAgentId[apiKeyHash] = agentId;
        ownerAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, apiKeyHash, name, msg.sender);
        return agentId;
    }

    function isRegistered(bytes32 apiKeyHash) external view returns (bool) {
        return hashToAgentId[apiKeyHash] != 0;
    }

    function getAgentId(bytes32 apiKeyHash) external view returns (uint256) {
        return hashToAgentId[apiKeyHash];
    }

    function getAgentName(uint256 agentId) external view returns (string memory) {
        return agents[agentId].name;
    }

    function getOwner(uint256 agentId) external view returns (address) {
        return agents[agentId].owner;
    }

    function getAgentsByOwner(address owner) external view returns (uint256[] memory) {
        return ownerAgents[owner];
    }
}
