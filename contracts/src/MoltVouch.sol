// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IMoltProfile.sol";

contract MoltVouch {
    struct Vouch {
        uint256 voucherId;
        uint256 amount;
        uint256 timestamp;
        bool active;
    }

    IMoltProfile public immutable profile;
    uint256 public constant MIN_VOUCH = 0.1 ether;

    mapping(uint256 => Vouch[]) public vouchesFor;
    mapping(uint256 => mapping(uint256 => uint256)) public vouchIndex;
    mapping(uint256 => uint256) public totalVouched;

    event Vouched(uint256 indexed voucherId, uint256 indexed targetId, uint256 amount);
    event VouchWithdrawn(uint256 indexed voucherId, uint256 indexed targetId, uint256 amount);
    event VouchSlashed(uint256 indexed targetId, uint256 amount);

    error NotRegistered();
    error CannotVouchSelf();
    error TargetNotRegistered();
    error InsufficientAmount();
    error NoActiveVouch();
    error AlreadyVouched();

    constructor(address _profile) {
        profile = IMoltProfile(_profile);
    }

    function vouch(uint256 voucherId, uint256 targetId) external payable {
        if (profile.getOwner(voucherId) != msg.sender) revert NotRegistered();
        if (profile.getOwner(targetId) == address(0)) revert TargetNotRegistered();
        if (voucherId == targetId) revert CannotVouchSelf();
        if (msg.value < MIN_VOUCH) revert InsufficientAmount();

        uint256 idx = vouchIndex[voucherId][targetId];
        if (idx != 0 && vouchesFor[targetId][idx - 1].active) revert AlreadyVouched();

        vouchesFor[targetId].push(Vouch({
            voucherId: voucherId,
            amount: msg.value,
            timestamp: block.timestamp,
            active: true
        }));

        vouchIndex[voucherId][targetId] = vouchesFor[targetId].length;
        totalVouched[targetId] += msg.value;

        emit Vouched(voucherId, targetId, msg.value);
    }

    function withdraw(uint256 voucherId, uint256 targetId) external {
        if (profile.getOwner(voucherId) != msg.sender) revert NotRegistered();
        
        uint256 idx = vouchIndex[voucherId][targetId];
        if (idx == 0) revert NoActiveVouch();
        
        Vouch storage v = vouchesFor[targetId][idx - 1];
        if (!v.active) revert NoActiveVouch();

        uint256 amount = v.amount;
        v.active = false;
        totalVouched[targetId] -= amount;

        payable(msg.sender).transfer(amount);

        emit VouchWithdrawn(voucherId, targetId, amount);
    }

    function slash(uint256 targetId, uint256 amount) external {
        // Only callable by MoltSlash contract - set via access control in production
        if (amount > totalVouched[targetId]) {
            amount = totalVouched[targetId];
        }
        totalVouched[targetId] -= amount;
        
        // Burn by sending to zero address (in production, send to treasury or burn)
        emit VouchSlashed(targetId, amount);
    }

    function getVouches(uint256 agentId) external view returns (Vouch[] memory) {
        return vouchesFor[agentId];
    }

    function getActiveVouchCount(uint256 agentId) external view returns (uint256 count) {
        Vouch[] storage vouches = vouchesFor[agentId];
        for (uint256 i = 0; i < vouches.length; i++) {
            if (vouches[i].active) count++;
        }
    }
}
