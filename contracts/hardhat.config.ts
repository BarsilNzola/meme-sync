import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(__dirname, "..", ".env") });

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    storyTestnet: {
      url: process.env.STORY_TESTNET_RPC_URL || "https://aeneid.storyrpc.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1315,
    },
  },
  paths: {
    artifacts: "../src/artifacts"
  },
};

export default config;