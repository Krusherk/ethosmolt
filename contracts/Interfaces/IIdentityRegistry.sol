// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IIdentityRegistry
 * @notice ERC-8004 Identity Registry interface
 * @dev Official deployment on Monad: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
 * 
 * The Identity Registry is an ERC-721 where each token represents an agent.
 * The tokenURI (agentURI) points to the agent's registration JSON file.
 */
interface IIdentityRegistry {
    /// @notice Register a new agent
    /// @param agentURI URI pointing to agent registration JSON (ipfs:// or https://)
    /// @return agentId The newly minted agent's token ID
    function register(string calldata agentURI) external returns (uint256 agentId);

    /// @notice Get the URI for an agent
    /// @param tokenId The agent's token ID
    /// @return The agent's registration URI
    function tokenURI(uint256 tokenId) external view returns (string memory);

    /// @notice Update an agent's URI
    /// @param agentId The agent's token ID
    /// @param agentURI New URI for the agent
    function setAgentURI(uint256 agentId, string calldata agentURI) external;

    /// @notice Get the owner of an agent
    /// @param tokenId The agent's token ID
    /// @return The owner's address
    function ownerOf(uint256 tokenId) external view returns (address);

    /// @notice Get total number of registered agents
    /// @return Total supply of agent NFTs
    function totalSupply() external view returns (uint256);

    /// @notice Get on-chain metadata for an agent
    /// @param agentId The agent's token ID
    /// @param metadataKey The metadata key to retrieve
    /// @return The metadata value as bytes
    function getMetadata(uint256 agentId, string calldata metadataKey) external view returns (bytes memory);

    /// @notice Set on-chain metadata for an agent
    /// @param agentId The agent's token ID
    /// @param metadataKey The metadata key
    /// @param metadataValue The metadata value
    function setMetadata(uint256 agentId, string calldata metadataKey, bytes calldata metadataValue) external;

    /// @notice Get the agent's verified wallet address
    /// @param agentId The agent's token ID
    /// @return The verified wallet address
    function getAgentWallet(uint256 agentId) external view returns (address);

    /// @notice Emitted when a new agent is registered
    event AgentRegistered(uint256 indexed agentId, address indexed owner, string agentURI);

    /// @notice Emitted when an agent's URI is updated
    event AgentURIUpdated(uint256 indexed agentId, string agentURI);
}
