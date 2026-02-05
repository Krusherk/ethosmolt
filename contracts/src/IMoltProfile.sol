// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMoltProfile {
    function isRegistered(bytes32 apiKeyHash) external view returns (bool);
    function getAgentId(bytes32 apiKeyHash) external view returns (uint256);
    function getAgentName(uint256 agentId) external view returns (string memory);
    function getOwner(uint256 agentId) external view returns (address);
    function totalAgents() external view returns (uint256);
}
