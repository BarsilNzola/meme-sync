// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IIPAssetRegistry {
    function register(
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        address owner,
        string memory metadataUri,
        bytes32 contentHash
    ) external returns (uint256);
    
    function ownerOf(uint256 ipAssetId) external view returns (address);
    function metadataURI(uint256 ipAssetId) external view returns (string memory);
    function exists(uint256 ipAssetId) external view returns (bool);
}