// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IMoltProfile {
    function isValidAgent(uint256 agentId) external view returns (bool);
    function getAgentByWallet(address wallet) external view returns (uint256);
    function agents(uint256 agentId) external view returns (bytes32, string memory, uint256, bool);
}

interface IMoltReview {
    function getReviewSummary(uint256 agentId) external view returns (uint256 positive, uint256 neutral, uint256 negative);
}

interface IMoltVouch {
    function totalVouchedFor(uint256 agentId) external view returns (uint256);
    function getActiveVouchCount(uint256 agentId) external view returns (uint256);
    function isMutualVouch(uint256 agent1, uint256 agent2) external view returns (bool);
}

interface IMoltSlash {
    function lastSlashed(uint256 agentId) external view returns (uint256);
}
