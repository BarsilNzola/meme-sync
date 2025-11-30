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
  // Check which IPFS service is configured
  const services = [];
  
  if (process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY) {
    services.push('Lighthouse');
  }
  if (process.env.NEXT_PUBLIC_PINATA_JWT) {
    services.push('Pinata');
  }
  if (process.env.NEXT_PUBLIC_NFT_STORAGE_API_KEY) {
    services.push('NFT.Storage');
  }

  console.log(`Available IPFS services: ${services.join(', ') || 'None'}`);

  if (services.length === 0) {
    // Return a mock IPFS URI for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Returning mock IPFS URI');
      return `ipfs://mock-dev-${Date.now()}`;
    }
    throw new Error('No IPFS service configured. Please set up Lighthouse, Pinata, or NFT.Storage.');
  }

  // Try services in order of preference
  if (process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY) {
    try {
      return await uploadToLighthouse(metadata);
    } catch (error) {
      console.warn('Lighthouse upload failed, trying next service:', error);
    }
  }
  
  if (process.env.NEXT_PUBLIC_PINATA_JWT) {
    try {
      return await uploadToPinata(metadata);
    } catch (error) {
      console.warn('Pinata upload failed, trying next service:', error);
    }
  }
  
  if (process.env.NEXT_PUBLIC_NFT_STORAGE_API_KEY) {
    try {
      return await uploadToNFTStorage(metadata);
    } catch (error) {
      console.warn('NFT.Storage upload failed:', error);
    }
  }

  throw new Error('All IPFS services failed');
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