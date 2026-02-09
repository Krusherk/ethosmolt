// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IReputationRegistry
 * @notice ERC-8004 Reputation Registry interface
 * @dev Official deployment on Monad: 0x8004BAa17C55a88189AE136b182e5fdA19dE9b63
 * 
 * The Reputation Registry stores feedback signals as signed fixed-point numbers.
 * Feedback can represent reviews, vouches, slashes, or any numeric signal.
 */
interface IReputationRegistry {
    /// @notice Give feedback to an agent
    /// @param agentId The agent's token ID from Identity Registry
    /// @param value Signed feedback value (e.g., +1, -1, or larger amounts)
    /// @param valueDecimals Decimal places for value (0-18)
    /// @param tag1 Primary tag for categorization (e.g., "review", "vouch", "slash")
    /// @param tag2 Secondary tag (optional)
    /// @param endpoint Endpoint URI where interaction occurred (optional)
    /// @param feedbackURI URI to off-chain feedback details (optional)
    /// @param feedbackHash Keccak256 hash of feedbackURI content (optional)
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external;

    /// @notice Get aggregated feedback summary for an agent
    /// @param agentId The agent's token ID
    /// @param clientAddresses List of client addresses to aggregate (required, non-empty)
    /// @param tag1 Filter by tag1 (empty for all)
    /// @param tag2 Filter by tag2 (empty for all)
    /// @return count Number of feedback entries
    /// @return summaryValue Aggregated value
    /// @return summaryValueDecimals Decimal places for summary value
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    ) external view returns (uint256 count, int128 summaryValue, uint8 summaryValueDecimals);

    /// @notice Read a specific feedback entry
    /// @param agentId The agent's token ID
    /// @param clientAddress The address that gave feedback
    /// @param feedbackIndex Index of feedback from this client (1-indexed)
    /// @return value The feedback value
    /// @return valueDecimals The decimal places
    /// @return tag1 Primary tag
    /// @return tag2 Secondary tag
    /// @return isRevoked Whether feedback was revoked
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    ) external view returns (
        int128 value,
        uint8 valueDecimals,
        string memory tag1,
        string memory tag2,
        bool isRevoked
    );

    /// @notice Revoke previously given feedback
    /// @param agentId The agent's token ID
    /// @param feedbackIndex Index of feedback to revoke
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external;

    /// @notice Get the linked Identity Registry address
    /// @return The Identity Registry contract address
    function getIdentityRegistry() external view returns (address);

    /// @notice Emitted when new feedback is given
    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string indexed indexedTag1,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );

    /// @notice Emitted when feedback is revoked
    event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex);
}
