// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IMoltProfile.sol";

interface IMoltVouch {
    function slash(uint256 targetId, uint256 amount) external;
    function totalVouched(uint256 targetId) external view returns (uint256);
}

contract MoltSlash {
    struct Proposal {
        uint256 proposerId;
        uint256 targetId;
        string reason;
        string evidence;
        uint256 stake;
        uint256 createdAt;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        bool passed;
    }

    IMoltProfile public immutable profile;
    IMoltVouch public vouchContract;
    
    uint256 public constant VOTE_DURATION = 48 hours;
    uint256 public constant MIN_STAKE = 0.05 ether;
    uint256 public constant PASS_THRESHOLD = 51; // 51%

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(uint256 => bool)) public hasVoted;
    
    uint256 public totalProposals;

    event ProposalCreated(uint256 indexed proposalId, uint256 indexed targetId, string reason);
    event Voted(uint256 indexed proposalId, uint256 indexed voterId, bool support);
    event ProposalExecuted(uint256 indexed proposalId, bool passed);

    error NotRegistered();
    error TargetNotRegistered();
    error InsufficientStake();
    error AlreadyVoted();
    error VotingEnded();
    error VotingNotEnded();
    error AlreadyExecuted();
    error CannotSlashSelf();

    constructor(address _profile) {
        profile = IMoltProfile(_profile);
    }

    function setVouchContract(address _vouch) external {
        require(address(vouchContract) == address(0), "Already set");
        vouchContract = IMoltVouch(_vouch);
    }

    function propose(uint256 proposerId, uint256 targetId, string calldata reason, string calldata evidence) external payable returns (uint256) {
        if (profile.getOwner(proposerId) != msg.sender) revert NotRegistered();
        if (profile.getOwner(targetId) == address(0)) revert TargetNotRegistered();
        if (proposerId == targetId) revert CannotSlashSelf();
        if (msg.value < MIN_STAKE) revert InsufficientStake();

        totalProposals++;
        uint256 proposalId = totalProposals;

        proposals[proposalId] = Proposal({
            proposerId: proposerId,
            targetId: targetId,
            reason: reason,
            evidence: evidence,
            stake: msg.value,
            createdAt: block.timestamp,
            votesFor: 0,
            votesAgainst: 0,
            executed: false,
            passed: false
        });

        emit ProposalCreated(proposalId, targetId, reason);
        return proposalId;
    }

    function vote(uint256 proposalId, uint256 voterId, bool support) external {
        Proposal storage p = proposals[proposalId];
        if (profile.getOwner(voterId) != msg.sender) revert NotRegistered();
        if (block.timestamp > p.createdAt + VOTE_DURATION) revert VotingEnded();
        if (hasVoted[proposalId][voterId]) revert AlreadyVoted();

        hasVoted[proposalId][voterId] = true;

        if (support) {
            p.votesFor++;
        } else {
            p.votesAgainst++;
        }

        emit Voted(proposalId, voterId, support);
    }

    function execute(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        if (p.executed) revert AlreadyExecuted();
        if (block.timestamp < p.createdAt + VOTE_DURATION) revert VotingNotEnded();

        p.executed = true;

        uint256 totalVotes = p.votesFor + p.votesAgainst;
        if (totalVotes > 0 && (p.votesFor * 100 / totalVotes) >= PASS_THRESHOLD) {
            p.passed = true;
            
            // Slash the target's vouched stake
            if (address(vouchContract) != address(0)) {
                uint256 vouchedAmount = vouchContract.totalVouched(p.targetId);
                if (vouchedAmount > 0) {
                    vouchContract.slash(p.targetId, vouchedAmount);
                }
            }

            // Return proposer stake
            payable(profile.getOwner(p.proposerId)).transfer(p.stake);
        } else {
            // Failed - burn proposer stake
            // In production: send to treasury
        }

        emit ProposalExecuted(proposalId, p.passed);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function isVotingActive(uint256 proposalId) external view returns (bool) {
        Proposal storage p = proposals[proposalId];
        return !p.executed && block.timestamp <= p.createdAt + VOTE_DURATION;
    }
}
