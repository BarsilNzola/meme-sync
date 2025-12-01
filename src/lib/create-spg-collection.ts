import { StoryClient } from '@story-protocol/core-sdk';
import { http, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts'; // CORRECT import path
import { zeroAddress } from 'viem';

// Your private key (store in .env.local!)
const PRIVATE_KEY = process.env.STORY_PRIVATE_KEY as `0x${string}`;

// Aeneid chain configuration - FIXED to match Chain type
const aeneid = {
  id: 1315,
  name: 'Story Aeneid',
  network: 'aeneid',
  nativeCurrency: {
    decimals: 18,
    name: 'IP Token',
    symbol: 'IP',
  },
  rpcUrls: {
    default: {
      http: ['https://aeneid.storyrpc.io'],
    },
    public: { // ADDED missing 'public' property
      http: ['https://aeneid.storyrpc.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Aeneid Explorer',
      url: 'https://aeneid-explorer.storyprotocol.xyz',
    },
  },
  testnet: true,
} as const;

async function createSPGCollection() {
  try {
    console.log('🚀 Starting SPG NFT collection creation with private key...');
    
    // 1. Create account from private key - CORRECT import
    const account = privateKeyToAccount(PRIVATE_KEY);
    console.log('📱 Using account:', account.address);
    
    // 2. Create wallet client - FIXED chain type
    const walletClient = createWalletClient({
      account,
      chain: aeneid,
      transport: http('https://aeneid.storyrpc.io'),
    });
    
    // 3. Create Story Protocol client - FIXED with type assertion
    const client = StoryClient.newClient({
      account: walletClient.account,
      transport: http('https://aeneid.storyrpc.io'),
      chainId: 'aeneid',
    } as any); // Type assertion to handle version mismatch
    
    console.log('✅ Story Protocol client initialized');
    
    // 4. Create SPG NFT collection - EXACT format from docs
    console.log('🏗️ Creating MemeSync SPG NFT collection...');
    
    const newCollection = await client.nftClient.createNFTCollection({
      name: "MemeSync Creations",
      symbol: "MSYNC", 
      isPublicMinting: true,
      mintOpen: true,
      mintFeeRecipient: zeroAddress, // Using imported zeroAddress
      contractURI: "",
    });
    
    if (!newCollection.spgNftContract) {
      throw new Error('No contract address returned');
    }
    
    console.log('🎉 SUCCESS! SPG NFT collection created!');
    console.log('========================================');
    console.log('📝 Contract Name: MemeSync Creations');
    console.log('🔤 Symbol: MSYNC');
    console.log('📍 Contract Address:', newCollection.spgNftContract);
    console.log('🔗 Transaction Hash:', newCollection.txHash);
    console.log('👤 Created by:', account.address);
    console.log('========================================');
    
    // 5. Save to environment file
    console.log('\n📋 Add this to your .env.local file:');
    console.log(`NEXT_PUBLIC_SPG_CONTRACT_ADDRESS=${newCollection.spgNftContract}`);
    
    return newCollection.spgNftContract;
    
  } catch (error: any) {
    console.error('❌ Failed to create SPG collection:', error);
    throw error;
  }
}

// Run the script
createSPGCollection()
  .then(() => {
    console.log('\n✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  });