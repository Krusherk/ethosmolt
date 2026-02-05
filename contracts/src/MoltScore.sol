// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IMoltProfile.sol";

interface IMoltReview {
    function getReviewStats(uint256 agentId) external view returns (uint256 positive, uint256 neutral, uint256 negative);
    function getReviewCount(uint256 agentId) external view returns (uint256);
}

interface IMoltVouchScore {
    function totalVouched(uint256 agentId) external view returns (uint256);
    function getActiveVouchCount(uint256 agentId) external view returns (uint256);
}

interface IMoltSlashScore {
    function totalProposals() external view returns (uint256);
}

contract MoltScore {
    IMoltProfile public immutable profile;
    IMoltReview public reviewContract;
    IMoltVouchScore public vouchContract;
    IMoltSlashScore public slashContract;

    // Score: 0-2800
    // Base: 1000
    // Reviews: +/- 600 max
    // Vouches: +800 max  
    // Slashes: -600 max
    uint256 public constant BASE_SCORE = 1000;
    uint256 public constant MAX_REVIEW_IMPACT = 600;
    uint256 public constant MAX_VOUCH_IMPACT = 800;
    uint256 public constant MAX_SLASH_IMPACT = 600;
    uint256 public constant MAX_SCORE = 2800;

    constructor(address _profile) {
        profile = IMoltProfile(_profile);
    }

    function setContracts(address _review, address _vouch, address _slash) external {
        require(address(reviewContract) == address(0), "Already set");
        reviewContract = IMoltReview(_review);
        vouchContract = IMoltVouchScore(_vouch);
        slashContract = IMoltSlashScore(_slash);
    }

    function calculateScore(uint256 agentId) external view returns (uint256) {
        if (profile.getOwner(agentId) == address(0)) return 0;

        uint256 score = BASE_SCORE;

        // Review impact
        if (address(reviewContract) != address(0)) {
            (uint256 positive, uint256 neutral, uint256 negative) = reviewContract.getReviewStats(agentId);
            uint256 total = positive + neutral + negative;
            
            if (total > 0) {
                // Net sentiment: positive adds, negative subtracts
                int256 netSentiment = int256(positive) - int256(negative);
                int256 reviewImpact = (netSentiment * int256(MAX_REVIEW_IMPACT)) / int256(total > 10 ? 10 : total);
                
                if (reviewImpact > 0) {
                    score += uint256(reviewImpact);
                } else if (reviewImpact < 0 && uint256(-reviewImpact) < score) {
                    score -= uint256(-reviewImpact);
                }
            }
        }

        // Vouch impact
        if (address(vouchContract) != address(0)) {
            uint256 vouched = vouchContract.totalVouched(agentId);
            uint256 vouchCount = vouchContract.getActiveVouchCount(agentId);
            
            // More vouchers and higher stake = higher score
            // Cap at 10 MON total vouched for max impact
            uint256 vouchImpact = (vouched * MAX_VOUCH_IMPACT) / (10 ether);
            if (vouchImpact > MAX_VOUCH_IMPACT) vouchImpact = MAX_VOUCH_IMPACT;
            
            // Bonus for multiple vouchers (diversity)
            if (vouchCount > 1) {
                vouchImpact += (vouchCount - 1) * 20;
                if (vouchImpact > MAX_VOUCH_IMPACT) vouchImpact = MAX_VOUCH_IMPACT;
            }
            
            score += vouchImpact;
        }

        // Cap at max
        if (score > MAX_SCORE) score = MAX_SCORE;

        return score;
    }

    function getScoreLevel(uint256 score) external pure returns (string memory) {
        if (score >= 2400) return "Renowned";
        if (score >= 1800) return "Reputable";
        if (score >= 1400) return "Established";
        if (score >= 1200) return "Neutral";
        if (score >= 800) return "Questionable";
        return "Untrusted";
    }

    function getScoreEmoji(uint256 score) external pure returns (string memory) {
        if (score >= 2400) return unicode"🟣";
        if (score >= 1800) return unicode"🔵";
        if (score >= 1400) return unicode"🟢";
        if (score >= 1200) return unicode"🟡";
        if (score >= 800) return unicode"🟠";
        return unicode"🔴";
    }
}
