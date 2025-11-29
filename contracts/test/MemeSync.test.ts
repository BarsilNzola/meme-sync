import { expect } from "chai";
import { ethers } from "hardhat";
import { MemeSync } from "../typechain-types";

describe("MemeSync", function () {
  let memeSync: MemeSync;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    const MemeSyncFactory = await ethers.getContractFactory("MemeSync");
    memeSync = await MemeSyncFactory.deploy();
    await memeSync.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await memeSync.owner()).to.equal(owner.address);
    });

    it("Should initialize with default templates", async function () {
      const template1 = await memeSync.memeTemplates(1);
      const template2 = await memeSync.memeTemplates(2);
      const template3 = await memeSync.memeTemplates(3);

      expect(template1.name).to.equal("Distracted Boyfriend");
      expect(template2.name).to.equal("Drake Hotline Bling");
      expect(template3.name).to.equal("Change My Mind");
      expect(template1.creator).to.equal(owner.address);
    });
  });

  describe("Meme Template Management", function () {
    it("Should create a meme template", async function () {
      const tx = await memeSync.connect(user1).createMemeTemplate(
        "Test Meme",
        "ipfs://QmTest123",
        5,
        3
      );
      
      await expect(tx)
        .to.emit(memeSync, "MemeTemplateCreated")
        .withArgs(4, "Test Meme", user1.address);

      const template = await memeSync.memeTemplates(4);
      expect(template.name).to.equal("Test Meme");
      expect(template.imageUri).to.equal("ipfs://QmTest123");
      expect(template.duration).to.equal(5);
      expect(template.frameCount).to.equal(3);
      expect(template.creator).to.equal(user1.address);
    });
  });

  describe("Audio Track Management", function () {
    it("Should create an audio track", async function () {
      const tx = await memeSync.connect(user1).createAudioTrack(
        "Test Beat",
        "ipfs://QmAudio123",
        15,
        120
      );

      await expect(tx)
        .to.emit(memeSync, "AudioTrackCreated")
        .withArgs(1, "Test Beat", user1.address);

      const track = await memeSync.audioTracks(1);
      expect(track.name).to.equal("Test Beat");
      expect(track.audioUri).to.equal("ipfs://QmAudio123");
      expect(track.duration).to.equal(15);
      expect(track.bpm).to.equal(120);
      expect(track.creator).to.equal(user1.address);
    });
  });

  describe("Project Management", function () {
    let memeTemplateId: number;
    let audioTrackId: number;

    beforeEach(async function () {
      await memeSync.connect(user1).createMemeTemplate("Test Meme", "ipfs://meme", 5, 3);
      await memeSync.connect(user1).createAudioTrack("Test Audio", "ipfs://audio", 15, 120);
      
      memeTemplateId = 4;
      audioTrackId = 1;
    });

    it("Should create a meme project", async function () {
      const tx = await memeSync.connect(user1).createMemeProject(
        memeTemplateId,
        audioTrackId,
        "My First Meme Project"
      );

      await expect(tx)
        .to.emit(memeSync, "ProjectCreated")
        .withArgs(1, user1.address);

      const project = await memeSync.getProject(1);
      expect(project.projectName).to.equal("My First Meme Project");
      expect(project.memeId).to.equal(memeTemplateId);
      expect(project.audioId).to.equal(audioTrackId);
      expect(project.creator).to.equal(user1.address);
      expect(project.status).to.equal(0);
    });

    it("Should fail to create project with non-existent meme", async function () {
      await expect(
        memeSync.connect(user1).createMemeProject(999, audioTrackId, "Invalid Project")
      ).to.be.revertedWith("Meme template not found");
    });

    it("Should fail to create project with non-existent audio", async function () {
      await expect(
        memeSync.connect(user1).createMemeProject(memeTemplateId, 999, "Invalid Project")
      ).to.be.revertedWith("Audio track not found");
    });
  });

  describe("Project Workflow", function () {
    let projectId: number;
    let memeTemplateId: number;
    let audioTrackId: number;

    beforeEach(async function () {
      await memeSync.connect(user1).createMemeTemplate("Test Meme", "ipfs://meme", 5, 3);
      await memeSync.connect(user1).createAudioTrack("Test Audio", "ipfs://audio", 15, 120);
      
      memeTemplateId = 4;
      audioTrackId = 1;
      
      await memeSync.connect(user1).createMemeProject(memeTemplateId, audioTrackId, "Test Project");
      projectId = 1;
    });

    it("Should sync project with audio points", async function () {
      const syncPoints = [0, 1, 2, 3, 4];
      
      const tx = await memeSync.connect(user1).syncProject(projectId, syncPoints);

      await expect(tx)
        .to.emit(memeSync, "ProjectSynced")
        .withArgs(projectId, syncPoints);

      const project = await memeSync.getProject(projectId);
      expect(project.status).to.equal(1);
      expect(project.syncPoints.length).to.equal(5);
    });

    it("Should export project", async function () {
      await memeSync.connect(user1).syncProject(projectId, [0, 1, 2]);

      const tx = await memeSync.connect(user1).exportProject(projectId, "ipfs://final-video");

      await expect(tx)
        .to.emit(memeSync, "ProjectExported")
        .withArgs(projectId, "ipfs://final-video");

      const project = await memeSync.getProject(projectId);
      expect(project.status).to.equal(2);
      expect(project.outputUri).to.equal("ipfs://final-video");
    });

    it("Should prepare IP asset and update status", async function () {
      await memeSync.connect(user1).syncProject(projectId, [0, 1, 2]);
      await memeSync.connect(user1).exportProject(projectId, "ipfs://final-video");

      const tx = await memeSync.connect(user1).prepareIPAsset(projectId, "ipfs://metadata");

      await expect(tx).to.emit(memeSync, "IPAssetPrepared");

      const project = await memeSync.getProject(projectId);
      expect(project.status).to.equal(3);
      expect(project.ipAssetHash).to.not.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
    });
  });

  describe("Access Control", function () {
    let projectId: number;
    let memeTemplateId: number;
    let audioTrackId: number;

    beforeEach(async function () {
      await memeSync.connect(user1).createMemeTemplate("Test Meme", "ipfs://meme", 5, 3);
      await memeSync.connect(user1).createAudioTrack("Test Audio", "ipfs://audio", 15, 120);
      
      memeTemplateId = 4;
      audioTrackId = 1;
      
      await memeSync.connect(user1).createMemeProject(memeTemplateId, audioTrackId, "Test Project");
      projectId = 1;
    });

    it("Should allow only project owner to sync", async function () {
      await expect(
        memeSync.connect(user2).syncProject(projectId, [0, 1, 2])
      ).to.be.revertedWith("Not project owner");
    });
  });

  describe("User Projects", function () {
    let memeTemplateId: number;
    let audioTrackId: number;

    beforeEach(async function () {
      await memeSync.connect(user1).createMemeTemplate("Meme1", "ipfs://1", 5, 3);
      await memeSync.connect(user1).createAudioTrack("Audio1", "ipfs://a1", 15, 120);
      
      memeTemplateId = 4;
      audioTrackId = 1;
    });

    it("Should return user's projects", async function () {
      await memeSync.connect(user1).createMemeProject(memeTemplateId, audioTrackId, "Project 1");
      await memeSync.connect(user1).createMemeProject(memeTemplateId, audioTrackId, "Project 2");

      const user1Projects = await memeSync.getUserProjects(user1.address);
      expect(user1Projects.length).to.equal(2);
      expect(user1Projects[0]).to.equal(1);
      expect(user1Projects[1]).to.equal(2);
    });

    it("Should return empty array for user with no projects", async function () {
      const user2Projects = await memeSync.getUserProjects(user2.address);
      expect(user2Projects.length).to.equal(0);
    });
  });
});