// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MemeSync is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    Counters.Counter private _memeTemplateIds;
    Counters.Counter private _audioTrackIds;
    Counters.Counter private _memeProjectIds;

    struct MemeTemplate {
        uint256 id;
        string name;
        string imageUri;
        uint256 duration;
        uint256 frameCount;
        address creator;
        uint256 createdAt;
    }

    struct AudioTrack {
        uint256 id;
        string name;
        string audioUri;
        uint256 duration;
        uint256 bpm;
        address creator;
        uint256 createdAt;
    }

    struct MemeProject {
        uint256 id;
        uint256 memeId;
        uint256 audioId;
        string projectName;
        address creator;
        uint256[] syncPoints;
        string outputUri;
        bytes32 ipAssetHash;
        ProjectStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    enum ProjectStatus {
        Draft,
        Synced,
        Exported,
        Registered,
        Archived
    }

    mapping(uint256 => MemeTemplate) public memeTemplates;
    mapping(uint256 => AudioTrack) public audioTracks;
    mapping(uint256 => MemeProject) public memeProjects;
    mapping(address => uint256[]) public userProjects;

    event MemeTemplateCreated(uint256 indexed templateId, string name, address creator);
    event AudioTrackCreated(uint256 indexed trackId, string name, address creator);
    event ProjectCreated(uint256 indexed projectId, address creator);
    event ProjectSynced(uint256 indexed projectId, uint256[] syncPoints);
    event ProjectExported(uint256 indexed projectId, string outputUri);
    event IPAssetPrepared(uint256 indexed projectId, bytes32 assetHash);

    constructor() {
        _initializeDefaultTemplates();
    }

    function _initializeDefaultTemplates() internal {
        _memeTemplateIds.increment();
        memeTemplates[1] = MemeTemplate({
            id: 1,
            name: "Distracted Boyfriend",
            imageUri: "ipfs://QmDefault1/distracted-boyfriend.jpg",
            duration: 5,
            frameCount: 3,
            creator: owner(),
            createdAt: block.timestamp
        });

        _memeTemplateIds.increment();
        memeTemplates[2] = MemeTemplate({
            id: 2,
            name: "Drake Hotline Bling", 
            imageUri: "ipfs://QmDefault2/drake.jpg",
            duration: 4,
            frameCount: 2,
            creator: owner(),
            createdAt: block.timestamp
        });

        _memeTemplateIds.increment();
        memeTemplates[3] = MemeTemplate({
            id: 3,
            name: "Change My Mind",
            imageUri: "ipfs://QmDefault3/change-my-mind.jpg", 
            duration: 6,
            frameCount: 1,
            creator: owner(),
            createdAt: block.timestamp
        });
    }

    function createMemeTemplate(
        string memory name,
        string memory imageUri,
        uint256 duration,
        uint256 frameCount
    ) external returns (uint256) {
        _memeTemplateIds.increment();
        uint256 newId = _memeTemplateIds.current();

        memeTemplates[newId] = MemeTemplate({
            id: newId,
            name: name,
            imageUri: imageUri,
            duration: duration,
            frameCount: frameCount,
            creator: msg.sender,
            createdAt: block.timestamp
        });

        emit MemeTemplateCreated(newId, name, msg.sender);
        return newId;
    }

    function createAudioTrack(
        string memory name,
        string memory audioUri,
        uint256 duration,
        uint256 bpm
    ) external returns (uint256) {
        _audioTrackIds.increment();
        uint256 newId = _audioTrackIds.current();

        audioTracks[newId] = AudioTrack({
            id: newId,
            name: name,
            audioUri: audioUri,
            duration: duration,
            bpm: bpm,
            creator: msg.sender,
            createdAt: block.timestamp
        });

        emit AudioTrackCreated(newId, name, msg.sender);
        return newId;
    }

    function createMemeProject(
        uint256 memeId,
        uint256 audioId,
        string memory projectName
    ) external returns (uint256) {
        require(memeId > 0 && memeId <= _memeTemplateIds.current(), "Meme template not found");
        require(audioId > 0 && audioId <= _audioTrackIds.current(), "Audio track not found");

        _memeProjectIds.increment();
        uint256 newId = _memeProjectIds.current();

        memeProjects[newId] = MemeProject({
            id: newId,
            memeId: memeId,
            audioId: audioId,
            projectName: projectName,
            creator: msg.sender,
            syncPoints: new uint256[](0),
            outputUri: "",
            ipAssetHash: bytes32(0),
            status: ProjectStatus.Draft,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        userProjects[msg.sender].push(newId);

        emit ProjectCreated(newId, msg.sender);
        return newId;
    }

    function syncProject(
        uint256 projectId,
        uint256[] memory syncPoints
    ) external projectExists(projectId) onlyProjectOwner(projectId) {
        MemeProject storage project = memeProjects[projectId];
        
        project.syncPoints = syncPoints;
        project.status = ProjectStatus.Synced;
        project.updatedAt = block.timestamp;

        emit ProjectSynced(projectId, syncPoints);
    }

    function exportProject(
        uint256 projectId,
        string memory outputUri
    ) external projectExists(projectId) onlyProjectOwner(projectId) {
        MemeProject storage project = memeProjects[projectId];
        require(project.status == ProjectStatus.Synced, "Project must be synced first");

        project.outputUri = outputUri;
        project.status = ProjectStatus.Exported;
        project.updatedAt = block.timestamp;

        emit ProjectExported(projectId, outputUri);
    }

    function prepareIPAsset(
        uint256 projectId,
        string memory metadataUri
    ) external projectExists(projectId) onlyProjectOwner(projectId) returns (bytes32) {
        MemeProject storage project = memeProjects[projectId];
        require(project.status == ProjectStatus.Exported, "Project must be exported first");

        bytes32 assetHash = keccak256(
            abi.encodePacked(
                project.memeId,
                project.audioId,
                project.outputUri,
                metadataUri,
                block.timestamp,
                msg.sender
            )
        );

        project.ipAssetHash = assetHash;
        project.status = ProjectStatus.Registered;
        project.updatedAt = block.timestamp;

        emit IPAssetPrepared(projectId, assetHash);
        return assetHash;
    }

    function getUserProjects(address user) external view returns (uint256[] memory) {
        return userProjects[user];
    }

    function getProject(uint256 projectId) external view projectExists(projectId) returns (MemeProject memory) {
        return memeProjects[projectId];
    }

    modifier onlyProjectOwner(uint256 projectId) {
        require(memeProjects[projectId].creator == msg.sender, "Not project owner");
        _;
    }

    modifier projectExists(uint256 projectId) {
        require(projectId > 0 && projectId <= _memeProjectIds.current(), "Project does not exist");
        _;
    }
}