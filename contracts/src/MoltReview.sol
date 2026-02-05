// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IMoltProfile.sol";

contract MoltReview {
    enum Sentiment { Negative, Neutral, Positive }

    struct Review {
        uint256 reviewerId;
        uint256 targetId;
        Sentiment sentiment;
        string content;
        uint256 timestamp;
    }

    IMoltProfile public immutable profile;

    mapping(uint256 => Review[]) public reviewsFor;
    mapping(uint256 => mapping(uint256 => bool)) public hasReviewed;
    
    uint256 public totalReviews;

    event ReviewSubmitted(
        uint256 indexed reviewerId,
        uint256 indexed targetId,
        Sentiment sentiment,
        string content
    );

    error NotRegistered();
    error CannotReviewSelf();
    error AlreadyReviewed();
    error TargetNotRegistered();

    constructor(address _profile) {
        profile = IMoltProfile(_profile);
    }

    function review(uint256 reviewerId, uint256 targetId, Sentiment sentiment, string calldata content) external {
        if (profile.getOwner(reviewerId) != msg.sender) revert NotRegistered();
        if (profile.getOwner(targetId) == address(0)) revert TargetNotRegistered();
        if (reviewerId == targetId) revert CannotReviewSelf();
        if (hasReviewed[reviewerId][targetId]) revert AlreadyReviewed();

        hasReviewed[reviewerId][targetId] = true;
        totalReviews++;

        reviewsFor[targetId].push(Review({
            reviewerId: reviewerId,
            targetId: targetId,
            sentiment: sentiment,
            content: content,
            timestamp: block.timestamp
        }));

        emit ReviewSubmitted(reviewerId, targetId, sentiment, content);
    }

    function getReviews(uint256 agentId) external view returns (Review[] memory) {
        return reviewsFor[agentId];
    }

    function getReviewCount(uint256 agentId) external view returns (uint256) {
        return reviewsFor[agentId].length;
    }

    function getReviewStats(uint256 agentId) external view returns (uint256 positive, uint256 neutral, uint256 negative) {
        Review[] storage reviews = reviewsFor[agentId];
        for (uint256 i = 0; i < reviews.length; i++) {
            if (reviews[i].sentiment == Sentiment.Positive) positive++;
            else if (reviews[i].sentiment == Sentiment.Neutral) neutral++;
            else negative++;
        }
    }
}
