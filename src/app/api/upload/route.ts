import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const metadata = await request.json();

    if (!metadata) {
      return NextResponse.json(
        { error: 'Metadata is required' },
        { status: 400 }
      );
    }

    // Debug: Log what env vars we have
    console.log('🔍 Environment Variables Status:', {
      nodeEnv: process.env.NODE_ENV,
      // Check both public and non-public versions
      pinataJwtExists: !!(process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT),
      nftStorageKeyExists: !!(process.env.NFT_STORAGE_API_KEY || process.env.NEXT_PUBLIC_NFT_STORAGE_API_KEY),
      // Show first few chars if they exist (for verification, not full keys)
      pinataPreview: process.env.PINATA_JWT
        ? `${process.env.PINATA_JWT.substring(0, 5)}...`
        : process.env.NEXT_PUBLIC_PINATA_JWT
          ? `${process.env.NEXT_PUBLIC_PINATA_JWT.substring(0, 5)}... (NEXT_PUBLIC)`
          : 'none',
      nftStoragePreview: process.env.NFT_STORAGE_API_KEY
        ? `${process.env.NFT_STORAGE_API_KEY.substring(0, 5)}...`
        : process.env.NEXT_PUBLIC_NFT_STORAGE_API_KEY
          ? `${process.env.NEXT_PUBLIC_NFT_STORAGE_API_KEY.substring(0, 5)}... (NEXT_PUBLIC)`
          : 'none',
    });

    // Upload to IPFS using your preferred service (Lighthouse, Pinata, NFT.Storage)
    const ipfsUri = await uploadToIPFS(metadata);

    return NextResponse.json({ 
      success: true, 
      ipfsUri 
    });
  } catch (error: any) {
    console.error('IPFS upload error:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload to IPFS' },
      { status: 500 }
    );
  }
}

// Helper to get the correct env var (tries non-public first, then public)
function getEnvVar(key: string): string | undefined {
  // Try non-public version first (for server-side)
  if (process.env[key]) {
    console.log(`Using server-side env var: ${key}`);
    return process.env[key];
  }
  
  // Try NEXT_PUBLIC version
  const publicKey = `NEXT_PUBLIC_${key}`;
  if (process.env[publicKey]) {
    console.log(`Using NEXT_PUBLIC env var: ${publicKey}`);
    return process.env[publicKey];
  }
  
  console.log(`Env var not found: ${key} or ${publicKey}`);
  return undefined;
}

async function uploadToIPFS(metadata: any): Promise<string> {
  // Get env vars using helper
  const pinataJWT = getEnvVar('PINATA_JWT');
  const nftStorageKey = getEnvVar('NFT_STORAGE_API_KEY');

  console.log('Available IPFS services:', {
    pinata: !!pinataJWT,
    nftStorage: !!nftStorageKey,
  });

  // In development with no services, return mock
  if (process.env.NODE_ENV === 'development' && !pinataJWT && !nftStorageKey) {
    console.log('Development mode: No IPFS services configured, returning mock URI');
    const mockHash = `Qm${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`.padEnd(46, '0').substring(0, 46);
    return `ipfs://${mockHash}`;
  }
  
  if (pinataJWT) {
    try {
      console.log('Trying Pinata...');
      return await uploadToPinata(metadata, pinataJWT);
    } catch (error: any) {
      console.warn('Pinata upload failed:', error.message);
    }
  }
  
  if (nftStorageKey) {
    try {
      console.log('Trying NFT.Storage...');
      return await uploadToNFTStorage(metadata, nftStorageKey);
    } catch (error: any) {
      console.warn('NFT.Storage upload failed:', error.message);
    }
  }

  throw new Error('All IPFS services failed or no services configured');
}

async function uploadToPinata(metadata: any, jwt: string): Promise<string> {
  console.log('Calling Pinata API...');
  
  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: `memesync-${Date.now()}.json`,
      },
    }),
  });

  console.log('Pinata response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Pinata API error:', { 
      status: response.status, 
      statusText: response.statusText,
      errorPreview: errorText.substring(0, 200)
    });
    throw new Error(`Pinata upload failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log('Pinata upload successful, hash:', result.IpfsHash);
  return `ipfs://${result.IpfsHash}`;
}

async function uploadToNFTStorage(metadata: any, apiKey: string): Promise<string> {
  console.log('Calling NFT.Storage API...');
  
  const response = await fetch('https://api.nft.storage/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  console.log('NFT.Storage response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('NFT.Storage API error:', { 
      status: response.status, 
      statusText: response.statusText,
      errorPreview: errorText.substring(0, 200)
    });
    throw new Error(`NFT.Storage upload failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log('NFT.Storage upload successful, CID:', result.value?.cid);
  return `ipfs://${result.value.cid}`;
}