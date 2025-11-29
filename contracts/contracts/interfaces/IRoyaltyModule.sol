// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IRoyaltyModule {
    function setRoyalty(
        address ipAssetRegistry,
        uint256 ipAssetId,
        address receiver,
        uint256 royaltyPercentageBps
    ) external;
    
    function getRoyaltyInfo(
        address ipAssetRegistry,
        uint256 ipAssetId
    ) external view returns (address, uint256);
}