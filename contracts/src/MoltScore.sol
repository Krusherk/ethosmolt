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
    uint256 public constant MAX_REVIEW_IMPACT = 100;
    uint256 public constant VOUCH_DIVISOR = 0.1 ether; // +1 point per 0.1 MON

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

        // Review impact (max +/- 100)
        (uint256 positive, , uint256 negative) = reviewContract.getSentimentCounts(agentId);
        if (positive > negative) {
            uint256 bonus = (positive - negative) * 10;
            score += bonus > MAX_REVIEW_IMPACT ? MAX_REVIEW_IMPACT : bonus;
        } else if (negative > positive) {
            uint256 penalty = (negative - positive) * 10;
            score = score > penalty ? score - penalty : 800;
        }

        // Vouch impact (+1 per 0.1 MON)
        uint256 vouched = vouchContract.totalVouched(agentId);
        score += vouched / VOUCH_DIVISOR;

        return score;
    }
}
