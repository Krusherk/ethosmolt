// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IMoltProfile} from "./IMoltProfile.sol";

contract MoltVouch {
    IMoltProfile public immutable profile;
    
    mapping(uint256 => mapping(uint256 => uint256)) public vouches;
    mapping(uint256 => uint256) public totalVouched;
    mapping(uint256 => bool) public hasActiveSlash;

    error NotRegistered();
    error TargetNotRegistered();
    error CannotVouchSelf();
    error NoVouchToWithdraw();
    error ActiveSlashProposal();

    event Vouched(uint256 indexed voucherId, uint256 indexed targetId, uint256 amount);
    event Withdrawn(uint256 indexed voucherId, uint256 indexed targetId, uint256 amount);

    constructor(address _profile) {
        profile = IMoltProfile(_profile);
    }

    function vouch(uint256 voucherId, uint256 targetId) external payable {
        if (msg.sender != profile.getOwner(voucherId)) revert NotRegistered();
        if (profile.getOwner(targetId) == address(0)) revert TargetNotRegistered();
        if (voucherId == targetId) revert CannotVouchSelf();

        vouches[voucherId][targetId] += msg.value;
        totalVouched[targetId] += msg.value;

        emit Vouched(voucherId, targetId, msg.value);
    }

    function withdraw(uint256 voucherId, uint256 targetId) external {
        if (msg.sender != profile.getOwner(voucherId)) revert NotRegistered();
        if (hasActiveSlash[targetId]) revert ActiveSlashProposal();
        
        uint256 amount = vouches[voucherId][targetId];
        if (amount == 0) revert NoVouchToWithdraw();

        vouches[voucherId][targetId] = 0;
        totalVouched[targetId] -= amount;

        payable(msg.sender).transfer(amount);
        emit Withdrawn(voucherId, targetId, amount);
    }

    function setActiveSlash(uint256 targetId, bool active) external {
        hasActiveSlash[targetId] = active;
    }

    function getVouch(uint256 voucherId, uint256 targetId) external view returns (uint256) {
        return vouches[voucherId][targetId];
    }
}
