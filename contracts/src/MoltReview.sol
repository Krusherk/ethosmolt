// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IMoltProfile} from "./IMoltProfile.sol";

contract MoltReview {
    enum Sentiment { Negative, Neutral, Positive }

    struct Review {
        uint256 reviewerId;
        uint256 targetId;
        Sentiment sentiment;
        string comment;
        uint256 timestamp;
    }

    IMoltProfile public immutable profile;
    mapping(uint256 => Review[]) public reviewsOf;
    mapping(uint256 => mapping(uint256 => bool)) public hasReviewed;
    mapping(uint256 => mapping(uint256 => uint256)) public reviewIndex;
    uint256 public totalReviews;

    error NotRegistered();
    error TargetNotRegistered();
    error CannotReviewSelf();
    error AlreadyReviewed();
    error NotReviewed();

    event ReviewSubmitted(uint256 indexed reviewerId, uint256 indexed targetId, Sentiment sentiment);
    event ReviewUpdated(uint256 indexed reviewerId, uint256 indexed targetId, Sentiment sentiment);

    constructor(address _profile) {
        profile = IMoltProfile(_profile);
    }

    function review(uint256 reviewerId, uint256 targetId, Sentiment sentiment, string calldata comment) external {
        if (msg.sender != profile.getOwner(reviewerId)) revert NotRegistered();
        if (profile.getOwner(targetId) == address(0)) revert TargetNotRegistered();
        if (reviewerId == targetId) revert CannotReviewSelf();
        if (hasReviewed[reviewerId][targetId]) revert AlreadyReviewed();

        hasReviewed[reviewerId][targetId] = true;
        reviewIndex[reviewerId][targetId] = reviewsOf[targetId].length;
        totalReviews++;

        reviewsOf[targetId].push(Review({
            reviewerId: reviewerId,
            targetId: targetId,
            sentiment: sentiment,
            comment: comment,
            timestamp: block.timestamp
        }));

        emit ReviewSubmitted(reviewerId, targetId, sentiment);
    }

    function updateReview(uint256 reviewerId, uint256 targetId, Sentiment sentiment, string calldata comment) external {
        if (msg.sender != profile.getOwner(reviewerId)) revert NotRegistered();
        if (!hasReviewed[reviewerId][targetId]) revert NotReviewed();

        uint256 idx = reviewIndex[reviewerId][targetId];
        reviewsOf[targetId][idx].sentiment = sentiment;
        reviewsOf[targetId][idx].comment = comment;
        reviewsOf[targetId][idx].timestamp = block.timestamp;

        emit ReviewUpdated(reviewerId, targetId, sentiment);
    }

    function getReviewCount(uint256 targetId) external view returns (uint256) {
        return reviewsOf[targetId].length;
    }

    function getReviews(uint256 targetId) external view returns (Review[] memory) {
        return reviewsOf[targetId];
    }

    function getSentimentCounts(uint256 targetId) external view returns (uint256 positive, uint256 neutral, uint256 negative) {
        Review[] memory reviews = reviewsOf[targetId];
        for (uint256 i = 0; i < reviews.length; i++) {
            if (reviews[i].sentiment == Sentiment.Positive) positive++;
            else if (reviews[i].sentiment == Sentiment.Neutral) neutral++;
            else negative++;
        }
    }
}
