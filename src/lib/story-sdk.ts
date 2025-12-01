import { StoryClient, IpMetadata, PILFlavor, WIP_TOKEN_ADDRESS } from '@story-protocol/core-sdk';
import { toHex } from 'viem';

// Use the pre-created SPG contract from environment
const SPG_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SPG_CONTRACT_ADDRESS as `0x${string}`;

// Contract addresses from Story Protocol Aeneid testnet
const ROYALTY_POLICY_LAP = '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E' as `0x${string}`;

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

export async function registerIPAsset(options: IPRegistrationOptions): Promise<RegistrationResult> {
  const { projectId, projectName, memeId, outputUri, metadataUri, walletClient } = options;

  try {
    console.log('Initializing Story Protocol client for Aeneid testnet...');

    // Validate wallet connection
    if (!walletClient || !walletClient.account) {
      throw new Error('Wallet not properly connected. Please connect your wallet first.');
    }

    // Initialize client with user's wallet - USE TYPE ASSERTION
    const client = StoryClient.newClient({
      account: walletClient.account,
      transport: 'https://aeneid.storyrpc.io', // Use string instead of http()
      chainId: 'aeneid',
    } as any); // Type assertion to handle version mismatch

    console.log('Story Protocol client initialized successfully');
    console.log('Using SPG NFT collection:', SPG_CONTRACT_ADDRESS);

    // Generate metadata
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

    // Register the IP asset using the pre-created SPG NFT collection
    const response = await client.ipAsset.registerIpAsset({
      nft: { 
        type: 'mint' as const, 
        spgNftContract: SPG_CONTRACT_ADDRESS
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
      'SPG NFT Contract': SPG_CONTRACT_ADDRESS
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
      spgNftContract: SPG_CONTRACT_ADDRESS,
    };

  } catch (error: any) {
    console.error('Story Protocol registration error:', error);
    
    if (error.message?.includes('user rejected')) {
      throw new Error('Transaction was rejected by your wallet');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient funds for transaction. You need IP tokens for gas.');
    } else if (error.message?.includes('unknown account')) {
      throw new Error('Wallet connection issue. Please ensure your wallet is properly connected.');
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