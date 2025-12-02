import { StoryClient, IpMetadata, PILFlavor, WIP_TOKEN_ADDRESS } from '@story-protocol/core-sdk';
import { parseEther, http, createPublicClient, parseAbiItem, decodeEventLog, zeroAddress } from 'viem';

// Use the pre-created SPG contract from environment
const SPG_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SPG_CONTRACT_ADDRESS as `0x${string}`;

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
    console.log('Starting Story Protocol registration...');
    
    // Validate wallet connection
    if (!walletClient || !walletClient.account) {
      throw new Error('Wallet client or account not available for signing.');
    }

    console.log('Wallet validated, address:', walletClient.account.address);

    // Check network
    const chainId = await walletClient.getChainId();
    console.log('Current network ID:', chainId);
    
    if (chainId !== 1315) {
      throw new Error(`Wrong network. Please switch to Story Aeneid (chain ID 1315). Current: ${chainId}`);
    }

    console.log('Using SPG NFT collection:', SPG_CONTRACT_ADDRESS);

    // Generate metadata with unique identifiers
    const timestamp = Date.now();
    const uniqueId = `${walletClient.account.address.slice(-8)}-${timestamp}-${Math.random().toString(36).substring(2, 9)}`;
    
    const ipMetadata: IpMetadata = {
      title: projectName,
      description: `MemeSync creation: ${projectName}`,
      createdAt: Math.floor(timestamp / 1000).toString(),
      creators: [
        {
          name: 'MemeSync Creator',
          address: walletClient.account.address,
          contributionPercent: 100,
        },
      ],
      image: memeId,
      mediaUrl: outputUri,
      mediaType: 'video/mp4',
      registrationId: uniqueId,
      projectId: projectId,
      timestamp: timestamp.toString(),
    };

    // Set up NFT metadata
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
        {
          trait_type: 'Registration ID',
          value: uniqueId,
        },
      ],
    };

    console.log('Uploading metadata to IPFS...');

    // Upload metadata to IPFS
    const ipIpfsHash = await uploadMetadataToIPFS(ipMetadata);
    const nftIpfsHash = await uploadMetadataToIPFS(nftMetadata);
    
    // Generate hashes
    const ipHash = await generateHash(JSON.stringify(ipMetadata));
    const nftHash = await generateHash(JSON.stringify(nftMetadata));

    console.log('Metadata uploaded to IPFS');
    console.log('IP Metadata URI:', ipIpfsHash);
    console.log('IP Metadata Hash:', ipHash);
    console.log('NFT Metadata URI:', nftIpfsHash);
    console.log('NFT Metadata Hash:', nftHash);

    console.log('Registering IP asset with Story Protocol...');

    // Use direct contract call with mintAndRegisterIp
    const publicClient = createPublicClient({
      transport: http('https://aeneid.storyrpc.io'),
    });

    const REGISTRATION_WORKFLOWS_ADDRESS = '0xbe39E1C756e921BD25DF86e7AAa31106d1eb0424' as `0x${string}`;
    
    // ABI for mintAndRegisterIp
    const REGISTRATION_WORKFLOWS_ABI = [
      {
        name: 'mintAndRegisterIp',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'spgNftContract', type: 'address' },
          { name: 'recipient', type: 'address' },
          {
            name: 'ipMetadata',
            type: 'tuple',
            components: [
              { name: 'ipMetadataURI', type: 'string' },
              { name: 'ipMetadataHash', type: 'bytes32' },
              { name: 'nftMetadataURI', type: 'string' },
              { name: 'nftMetadataHash', type: 'bytes32' },
            ],
          },
          { name: 'allowDuplicates', type: 'bool' },
        ],
        outputs: [
          { name: 'ipId', type: 'address' },
          { name: 'tokenId', type: 'uint256' },
        ],
      },
    ] as const;

    // Use Pinata gateway for better reliability
    const pinataGateway = 'https://gateway.pinata.cloud/ipfs/';
    const ipMetadataURI = ipIpfsHash.startsWith('ipfs://') 
      ? `${pinataGateway}${ipIpfsHash.replace('ipfs://', '')}`
      : ipIpfsHash;
    const nftMetadataURI = nftIpfsHash.startsWith('ipfs://') 
      ? `${pinataGateway}${nftIpfsHash.replace('ipfs://', '')}`
      : nftIpfsHash;

    console.log('Calling mintAndRegisterIp...');
    
    // First simulate to catch errors early
    const { request } = await publicClient.simulateContract({
      address: REGISTRATION_WORKFLOWS_ADDRESS,
      abi: REGISTRATION_WORKFLOWS_ABI,
      functionName: 'mintAndRegisterIp',
      args: [
        SPG_CONTRACT_ADDRESS as `0x${string}`,
        walletClient.account.address as `0x${string}`,
        {
          ipMetadataURI: ipMetadataURI,
          ipMetadataHash: `0x${ipHash}` as `0x${string}`,
          nftMetadataURI: nftMetadataURI,
          nftMetadataHash: `0x${nftHash}` as `0x${string}`,
        },
        true, // allowDuplicates
      ],
      account: walletClient.account,
    });

    const hash = await walletClient.writeContract(request);
    console.log('Transaction sent, hash:', hash);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('Transaction confirmed:', receipt.status);
    
    if (receipt.status !== 'success') {
      throw new Error('Transaction failed');
    }
    
    // Extract IP ID from logs or calculate it
    let ipId: string | null = null;
    
    // Try to extract from logs first
    const IP_REGISTERED_EVENT = parseAbiItem(
      'event IPRegistered(address indexed caller, address indexed ipId, address indexed ipAssetRegistry, uint256 tokenId, string ipMetadataURI)'
    );
    
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: [IP_REGISTERED_EVENT],
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName === 'IPRegistered') {
          ipId = decoded.args.ipId;
          console.log('IPRegistered event found! IP ID:', ipId);
          break;
        }
      } catch (e) {
        // Not the event we're looking for
      }
    }
    
    // Fallback: calculate IP ID from token ID
    if (!ipId) {
      console.log('IPRegistered event not found, calculating IP ID from token...');
      
      // Query the latest token ID from SPG contract
      const spgAbi = [
        {
          name: 'totalSupply',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'uint256' }],
        },
      ] as const;
      
      const totalSupply = await publicClient.readContract({
        address: SPG_CONTRACT_ADDRESS as `0x${string}`,
        abi: spgAbi,
        functionName: 'totalSupply',
      });
      
      // The minted token ID should be totalSupply - 1 (since it was just minted)
      const tokenId = totalSupply - BigInt(1);
      console.log('Calculated token ID:', tokenId.toString());
      
      // Calculate IP ID using IPAssetRegistry
      const IP_ASSET_REGISTRY_ADDRESS = '0x77319B4031e6eF1250907aa00018B8B1c67a244b' as `0x${string}`;
      const ipAssetRegistryAbi = [
        {
          name: 'ipId',
          type: 'function',
          stateMutability: 'view',
          inputs: [
            { name: 'chainId', type: 'uint256' },
            { name: 'tokenContract', type: 'address' },
            { name: 'tokenId', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'address' }],
        },
      ] as const;
      
      ipId = await publicClient.readContract({
        address: IP_ASSET_REGISTRY_ADDRESS,
        abi: ipAssetRegistryAbi,
        functionName: 'ipId',
        args: [BigInt(1315), SPG_CONTRACT_ADDRESS as `0x${string}`, tokenId],
      });
      console.log('Calculated IP ID:', ipId);
    }
    
    if (!ipId) {
      throw new Error('Could not determine IP ID');
    }

    console.log('IP Asset registered successfully!');
    console.log('IP ID:', ipId);
    console.log('Transaction Hash:', hash);
    console.log('View on explorer:', `https://aeneid-explorer.storyprotocol.xyz/ipa/${ipId}`);

    return {
      success: true,
      ipAssetId: ipId,
      txHash: hash,
      licenseTermsIds: [], // No license terms attached initially
      spgNftContract: SPG_CONTRACT_ADDRESS,
    };

  } catch (error: any) {
    console.error('Story Protocol registration error:', error);
    
    // Enhanced error handling
    if (error.message?.includes('user rejected')) {
      throw new Error('Transaction was rejected by your wallet');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient funds for transaction. You need IP tokens for gas.');
    } else if (error.message?.includes('Timed out') || error.message?.includes('timeout')) {
      throw new Error('Network timeout. The Story Protocol network might be busy. Please try again in a few minutes.');
    } else if (error.message?.includes('wrong network') || error.message?.includes('chain')) {
      throw new Error('Wrong network. Please switch to Story Aeneid testnet (chain ID 1315).');
    } else if (error.message?.includes('publicMinting')) {
      throw new Error('SPG contract issue. Your custom SPG contract might not support public minting.');
    } else if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
      throw new Error('Duplicate metadata detected. Please modify your metadata or try with different content.');
    } else if (error.message?.includes('Missing or invalid parameters')) {
      throw new Error(`Contract parameter error. This usually means:\n1. Metadata hash mismatch\n2. IPFS URI not accessible\n3. Invalid contract address\n\nDetails: ${error.message}`);
    } else {
      console.error('Full error details:', {
        message: error.message,
        shortMessage: error.shortMessage,
        cause: error.cause,
        data: error.data,
      });
      throw new Error(`Registration failed: ${error.message || 'Unknown error'}\n\nCheck browser console for more details.`);
    }
  }
}

async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  
  const hashString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  if (hashString.length !== 64) {
    throw new Error(`SHA-256 hash is not 64 characters long: ${hashString}`);
  }
  
  return hashString; // Should be 64 characters long
}

async function uploadMetadataToIPFS(metadata: any): Promise<string> {
  try {
    console.log('Attempting to upload metadata to IPFS...');
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IPFS upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('IPFS upload successful');
    
    // Return the full IPFS URI
    return result.ipfsUri || `ipfs://${result.hash || result.IpfsHash}`;
  } catch (error: any) {
    console.error('IPFS upload error:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
}