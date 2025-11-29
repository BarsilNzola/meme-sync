// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ILicensingModule {
    function attachLicenseTerms(
        address ipAssetRegistry,
        uint256 ipAssetId,
        uint256 licenseTermsId,
        address attacher
    ) external;
    
    function registerDerivative(
        uint256 parentIpAssetId,
        uint256 childIpAssetId,
        uint256 licenseTermsId
    ) external;
}