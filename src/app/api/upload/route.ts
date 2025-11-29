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

    // Upload to IPFS using your preferred service (Lighthouse, Pinata, NFT.Storage)
    const ipfsUri = await uploadToIPFS(metadata);

    return NextResponse.json({ 
      success: true, 
      ipfsUri 
    });
  } catch (error) {
    console.error('IPFS upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload to IPFS' },
      { status: 500 }
    );
  }
}

async function uploadToIPFS(metadata: any): Promise<string> {
  // Choose your IPFS service:

  // Option 1: Lighthouse Storage
  if (process.env.LIGHTHOUSE_API_KEY) {
    return await uploadToLighthouse(metadata);
  }
  
  // Option 2: Pinata
  if (process.env.PINATA_API_KEY) {
    return await uploadToPinata(metadata);
  }

  // Option 3: NFT.Storage
  if (process.env.NFT_STORAGE_API_KEY) {
    return await uploadToNFTStorage(metadata);
  }

  throw new Error('No IPFS service configured');
}

async function uploadToLighthouse(metadata: any): Promise<string> {
  const response = await fetch('https://api.lighthouse.storage/api/lighthouse/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LIGHTHOUSE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: JSON.stringify(metadata),
      name: `memesync-${Date.now()}.json`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Lighthouse upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return `ipfs://${result.Hash}`;
}

async function uploadToPinata(metadata: any): Promise<string> {
  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PINATA_JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: `memesync-${Date.now()}.json`,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return `ipfs://${result.IpfsHash}`;
}

async function uploadToNFTStorage(metadata: any): Promise<string> {
  const response = await fetch('https://api.nft.storage/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NFT_STORAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    throw new Error(`NFT.Storage upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return `ipfs://${result.value.cid}`;
}