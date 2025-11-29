import { StoryClient, IpMetadata, PILFlavor, WIP_TOKEN_ADDRESS } from '@story-protocol/core-sdk';
import { parseEther } from 'viem';

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
}

const SPG_NFT_CONTRACT_ADDRESS = '0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc' as `0x${string}`;

export async function registerIPAsset(options: IPRegistrationOptions): Promise<RegistrationResult> {
  const { projectId, projectName, memeId, outputUri, metadataUri, walletClient } = options;

  try {
    const client = StoryClient.newClient({
      account: walletClient.account,
      transport: walletClient.transport,
      chainId: 'aeneid',
    });

    const imageHash = `0x${await generateHash(memeId)}` as `0x${string}`;
    const mediaHash = `0x${await generateHash(outputUri)}` as `0x${string}`;

    const ipMetadata: IpMetadata = client.ipAsset.generateIpMetadata({
      title: projectName,
      description: `MemeSync creation: ${projectName}`,
      createdAt: Math.floor(Date.now() / 1000).toString(),
      creators: [
        {
          name: 'MemeSync Creator',
          address: walletClient.account.address as `0x${string}`,
          contributionPercent: 100,
        },
      ],
      image: memeId,
      imageHash: imageHash,
      mediaUrl: outputUri,
      mediaHash: mediaHash,
      mediaType: 'video/mp4',
    });

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
      ],
    };

    const ipIpfsHash = await uploadMetadataToIPFS(ipMetadata);
    const nftIpfsHash = await uploadMetadataToIPFS(nftMetadata);
    
    const ipHash = `0x${await generateHash(JSON.stringify(ipMetadata))}` as `0x${string}`;
    const nftHash = `0x${await generateHash(JSON.stringify(nftMetadata))}` as `0x${string}`;

    const response = await client.ipAsset.registerIpAsset({
      nft: { 
        type: 'mint' as const, 
        spgNftContract: SPG_NFT_CONTRACT_ADDRESS 
      },
      licenseTermsData: [
        {
          terms: PILFlavor.commercialRemix({
            commercialRevShare: 10,
            defaultMintingFee: parseEther('0.1'),
            currency: WIP_TOKEN_ADDRESS,
          }),
        },
      ],
      ipMetadata: {
        ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
        ipMetadataHash: ipHash,
        nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
        nftMetadataHash: nftHash,
      },
    });

    console.log('IP Asset created on Aeneid:', {
      'Transaction Hash': response.txHash,
      'IPA ID': response.ipId,
      'License Terms IDs': response.licenseTermsIds,
    });

    const licenseTermsIds = response.licenseTermsIds?.map(id => id.toString()) || [];

    return {
      success: true,
      ipAssetId: response.ipId!,
      txHash: response.txHash!,
      licenseTermsIds: licenseTermsIds,
    };

  } catch (error: any) {
    console.error('Story Protocol registration error:', error);
    
    if (error.message?.includes('user rejected')) {
      throw new Error('Transaction was rejected by your wallet');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient funds for transaction');
    } else if (error.message?.includes('network')) {
      throw new Error('Network error. Please check your connection');
    } else if (error.message?.includes('already registered')) {
      throw new Error('This content is already registered');
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
    const response = await fetch('/api/ipfs/upload', {
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
    return result.ipfsUri.replace('ipfs://', '');
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
}

export async function transferIPAssetViaNFT(ipAssetId: string, toAddress: string, walletClient: any) {
  try {
    console.warn('Direct IP Asset transfer not available in current SDK. Consider transferring the underlying NFT instead.');
    throw new Error('IP Asset transfer functionality not implemented in current SDK version');
  } catch (error) {
    console.error('Error transferring IP asset:', error);
    throw error;
  }
}

export async function getIPAssetDetailsViaAPI(ipAssetId: string) {
  try {
    const response = await fetch('https://api.story.foundation/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query GetIPAsset($ipId: String!) {
            ipAsset(ipId: $ipId) {
              id
              owner
              createdAt
            }
          }
        `,
        variables: {
          ipId: ipAssetId
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch IP asset details');
    }

    const result = await response.json();
    return result.data.ipAsset;
  } catch (error) {
    console.error('Error fetching IP asset details:', error);
    throw error;
  }
}

export async function getIPAssetDetailsIfAvailable(ipAssetId: string, walletClient: any) {
  try {
    const client = StoryClient.newClient({
      account: walletClient.account,
      transport: walletClient.transport,
      chainId: 'aeneid',
    });

    console.log('Available IP asset methods:', Object.keys(client.ipAsset));
    
    throw new Error('IP Asset details retrieval not available in current SDK. Use GraphQL API instead.');
  } catch (error) {
    console.error('Error fetching IP asset details:', error);
    throw error;
  }
}