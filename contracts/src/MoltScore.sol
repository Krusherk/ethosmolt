// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IMoltProfile} from "./IMoltProfile.sol";

interface IMoltReview {
    function getSentimentCounts(uint256 targetId) external view returns (uint256 positive, uint256 neutral, uint256 negative);
}

interface IMoltVouch {
    function totalVouched(uint256 targetId) external view returns (uint256);
}

contract MoltScore {
    uint256 public constant BASE_SCORE = 1200;
    uint256 public constant MAX_REVIEW_IMPACT = 200;
    uint256 public constant VOUCH_MULTIPLIER = 100; // 1 point per 0.01 MON

    IMoltProfile public immutable profile;
    IMoltReview public immutable reviewContract;
    IMoltVouch public immutable vouchContract;

    constructor(address _profile, address _review, address _vouch) {
        profile = IMoltProfile(_profile);
        reviewContract = IMoltReview(_review);
        vouchContract = IMoltVouch(_vouch);
    }

    function calculateScore(uint256 agentId) external view returns (uint256) {
        if (profile.getOwner(agentId) == address(0)) return 0;

        uint256 score = BASE_SCORE;

        // Review impact
        (uint256 positive, , uint256 negative) = reviewContract.getSentimentCounts(agentId);
        uint256 total = positive + negative;
        if (total > 0) {
            if (positive > negative) {
                uint256 diff = positive - negative;
                uint256 impact = (diff * MAX_REVIEW_IMPACT) / (total > 10 ? 10 : total);
                score += impact > MAX_REVIEW_IMPACT ? MAX_REVIEW_IMPACT : impact;
            } else if (negative > positive) {
                uint256 diff = negative - positive;
                uint256 impact = (diff * MAX_REVIEW_IMPACT) / (total > 10 ? 10 : total);
                uint256 penalty = impact > MAX_REVIEW_IMPACT ? MAX_REVIEW_IMPACT : impact;
                score = score > penalty ? score - penalty : 0;
            }
        }

        // Vouch impact (+1 point per 0.01 MON)
        uint256 vouched = vouchContract.totalVouched(agentId);
        score += (vouched * VOUCH_MULTIPLIER) / 0.01 ether;

        return score;
    }
}
