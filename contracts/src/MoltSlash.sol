// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IMoltProfile} from "./IMoltProfile.sol";

contract MoltSlash {
    struct Proposal {
        uint256 targetId;
        address proposer;
        uint256 stakeAmount;
        string reason;
        string evidence;
        uint256 createdAt;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        bool passed;
    }

    IMoltProfile public immutable profile;
    uint256 public constant MIN_STAKE = 0.05 ether;
    uint256 public constant VOTING_PERIOD = 48 hours;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(uint256 => bool)) public hasVoted;
    uint256 public proposalCount;

    error NotRegistered();
    error TargetNotRegistered();
    error InsufficientStake();
    error AlreadyVoted();
    error VotingEnded();
    error VotingNotEnded();
    error AlreadyExecuted();

    event ProposalCreated(uint256 indexed proposalId, uint256 indexed targetId, address proposer);
    event Voted(uint256 indexed proposalId, uint256 indexed voterId, bool support);
    event ProposalExecuted(uint256 indexed proposalId, bool passed);

    constructor(address _profile) {
        profile = IMoltProfile(_profile);
    }

    function propose(uint256 proposerId, uint256 targetId, string calldata reason, string calldata evidence) external payable {
        if (msg.sender != profile.getOwner(proposerId)) revert NotRegistered();
        if (profile.getOwner(targetId) == address(0)) revert TargetNotRegistered();
        if (msg.value < MIN_STAKE) revert InsufficientStake();

        proposalCount++;
        proposals[proposalCount] = Proposal({
            targetId: targetId,
            proposer: msg.sender,
            stakeAmount: msg.value,
            reason: reason,
            evidence: evidence,
            createdAt: block.timestamp,
            votesFor: 1,
            votesAgainst: 0,
            executed: false,
            passed: false
        });

        hasVoted[proposalCount][proposerId] = true;
        emit ProposalCreated(proposalCount, targetId, msg.sender);
    }

    function vote(uint256 proposalId, uint256 voterId, bool support) external {
        Proposal storage p = proposals[proposalId];
        if (msg.sender != profile.getOwner(voterId)) revert NotRegistered();
        if (hasVoted[proposalId][voterId]) revert AlreadyVoted();
        if (block.timestamp > p.createdAt + VOTING_PERIOD) revert VotingEnded();

        hasVoted[proposalId][voterId] = true;
        if (support) p.votesFor++;
        else p.votesAgainst++;

        emit Voted(proposalId, voterId, support);
    }

    function execute(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        if (p.executed) revert AlreadyExecuted();
        if (block.timestamp < p.createdAt + VOTING_PERIOD) revert VotingNotEnded();

        p.executed = true;
        p.passed = p.votesFor > p.votesAgainst;

        if (p.passed) {
            // Slash passed - proposer keeps stake
            payable(p.proposer).transfer(p.stakeAmount);
        }
        // If failed, stake stays in contract (penalty for bad proposal)

        emit ProposalExecuted(proposalId, p.passed);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }
}
