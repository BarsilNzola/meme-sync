import hre from "hardhat";

async function main() {
  const { ethers } = hre;
  
  // Get signers
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  
  if (!deployer) {
    throw new Error("No deployer account found");
  }

  console.log("Deploying with account:", deployer.address);

  const MemeSync = await ethers.getContractFactory("MemeSync");
  const memeSync = await MemeSync.deploy();

  // Wait for deployment to complete
  await memeSync.waitForDeployment();
  
  // Get the contract address
  const contractAddress = await memeSync.getAddress();

  console.log("MemeSync deployed to:", contractAddress);
  
  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: "story-testnet",
    contract: "MemeSync",
    address: contractAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment info saved to deployment.json");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});