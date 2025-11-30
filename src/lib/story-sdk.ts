import { StoryClient, IpMetadata, PILFlavor, WIP_TOKEN_ADDRESS } from '@story-protocol/core-sdk';
import { toHex, zeroAddress, http } from 'viem';

interface IPRegistrationOptions {
  projectId: string;
  projectName: string;
  memeId: string;
  outputUri: string;
  metadataUri: string;
  walletClient: any;
}

interface RegistrationResult {
  success: boolean;
  ipAssetId: string;
  txHash: string;
  licenseTermsIds: string[];
  spgNftContract?: string;
}

// Contract addresses from Story Protocol Aeneid testnet
const ROYALTY_POLICY_LAP = '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E' as `0x${string}`;

// We'll create our own SPG NFT collection
let memesyncNFTContract: string | null = null;

export async function registerIPAsset(options: IPRegistrationOptions): Promise<RegistrationResult> {
  const { projectId, projectName, memeId, outputUri, metadataUri, walletClient } = options;

  try {
    console.log('Initializing Story Protocol client for Aeneid testnet...');

    // Simple client initialization
    const client = StoryClient.newClient({
      account: walletClient.account,
      transport: http('https://aeneid.storyrpc.io'),
      chainId: 'aeneid',
    } as any);

    console.log('Story Protocol client initialized successfully');

    // Create or get our MemeSync SPG NFT collection
    let spgNftContract: string | null = memesyncNFTContract;
    if (!spgNftContract) {
      console.log('Creating MemeSync SPG NFT collection...');
      
      // Use EXACTLY the parameters from the working documentation
      const newCollection = await client.nftClient.createNFTCollection({
        name: "MemeSync Creations",
        symbol: "MSYNC", 
        isPublicMinting: true,
        mintOpen: true,
        mintFeeRecipient: zeroAddress,
        contractURI: "",
      });

      if (!newCollection.spgNftContract) {
        throw new Error('Failed to create SPG NFT collection - no contract address returned');
      }
      
      spgNftContract = newCollection.spgNftContract;
      memesyncNFTContract = spgNftContract;
      
      console.log('New collection created:', {
        'SPG NFT Contract Address': newCollection.spgNftContract,
        'Transaction Hash': newCollection.txHash,
      });
    } else {
      console.log('Using existing MemeSync SPG NFT collection:', spgNftContract);
    }

    // Generate metadata (rest of your existing code remains the same)
    const ipMetadata = {
      title: projectId,
      description: `MemeSync creation: ${projectName}`,
      image: memeId,
      mediaUrl: outputUri,
      mediaType: 'video/mp4',
      createdAt: Math.floor(Date.now() / 1000).toString(),
      creators: [
        {
          name: 'MemeSync Creator',
          address: walletClient.account.address,
          contributionPercent: 100,
        },
      ],
    };

    const nftMetadata = {
      name: `MemeSync: ${projectName}`,
      description: `AI-generated meme with synchronized audio. This NFT represents ownership of the IP Asset.`,
      image: memeId,
      animation_url: outputUri,
      attributes: [
        {
          trait_type: 'Project ID',
          value: projectId,
        },
        {
          trait_type: 'Media Type', 
          value: 'Meme with Audio',
        },
        {
          trait_type: 'Creator',
          value: walletClient.account.address,
        },
        {
          trait_type: 'Source',
          value: 'MemeSync',
        },
        {
          trait_type: 'Collection',
          value: 'MemeSync Creations',
        },
      ],
    };

    console.log('Uploading metadata to IPFS...');

    // Upload metadata to IPFS
    const ipIpfsHash = await uploadMetadataToIPFS(ipMetadata);
    const nftIpfsHash = await uploadMetadataToIPFS(nftMetadata);
    
    // Generate hashes
    const ipMetadataHash = await generateHash(JSON.stringify(ipMetadata));
    const nftMetadataHash = await generateHash(JSON.stringify(nftMetadata));

    console.log('Metadata uploaded to IPFS:', { ipIpfsHash, nftIpfsHash });

    console.log('Registering IP asset with Story Protocol...');

    // Register the IP asset using our custom SPG NFT collection
    const response = await client.ipAsset.registerIpAsset({
      nft: { 
        type: 'mint' as const, 
        spgNftContract: spgNftContract as `0x${string}`
      },
      licenseTermsData: [
        {
          terms: PILFlavor.creativeCommonsAttribution({
            currency: WIP_TOKEN_ADDRESS,
            royaltyPolicy: ROYALTY_POLICY_LAP,
          }),
        },
        {
          terms: PILFlavor.commercialRemix({
            commercialRevShare: 20,
            defaultMintingFee: BigInt(10000),
            currency: WIP_TOKEN_ADDRESS,
            royaltyPolicy: ROYALTY_POLICY_LAP,
          }),
          maxLicenseTokens: 100,
        },
      ],
      royaltyShares: [
        {
          recipient: walletClient.account.address as `0x${string}`,
          percentage: 10,
        },
      ],
      ipMetadata: {
        ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
        ipMetadataHash: toHex(ipMetadataHash, { size: 32 }),
        nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
        nftMetadataHash: toHex(nftMetadataHash, { size: 32 }),
      },
    });

    console.log('IP Asset created on Aeneid:', {
      'Transaction Hash': response.txHash,
      'IPA ID': response.ipId,
      'SPG NFT Contract': spgNftContract
    });

    // Handle the response structure properly
    const licenseTermsIds = 'licenseTermsIds' in response 
      ? (response as any).licenseTermsIds?.map((id: any) => id.toString()) || []
      : [];

    return {
      success: true,
      ipAssetId: response.ipId!,
      txHash: response.txHash!,
      licenseTermsIds,
      spgNftContract: spgNftContract!,
    };

  } catch (error: any) {
    console.error('Story Protocol registration error:', error);
    
    if (error.message?.includes('user rejected')) {
      throw new Error('Transaction was rejected by your wallet');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient funds for transaction');
    } else if (error.message?.includes('unknown account')) {
      throw new Error('Wallet connection issue. Please ensure your wallet is properly connected and you\'re on the correct network.');
    } else {
      throw new Error(`Registration failed: ${error.message || 'Unknown error'}`);
    }
  }
}

async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function uploadMetadataToIPFS(metadata: any): Promise<string> {
  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload to IPFS');
    }

    const result = await response.json();
    return result.ipfsUri;
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
}