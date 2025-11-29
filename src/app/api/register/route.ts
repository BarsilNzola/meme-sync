import { NextRequest, NextResponse } from 'next/server';
import { registerIPAsset } from '@/lib/story-sdk';

export async function POST(request: NextRequest) {
  try {
    const { projectId, memeUrl, audioUrl, metadata } = await request.json();

    if (!projectId || !memeUrl || !audioUrl) {
      return NextResponse.json(
        { error: 'Project ID, meme URL, and audio URL are required' },
        { status: 400 }
      );
    }

    // Register with Story Protocol
    const registrationResult = await registerIPAsset({
      projectId,
      memeUrl,
      audioUrl,
      metadata: metadata || {},
    });

    return NextResponse.json({
      success: true,
      ipAssetId: registrationResult.ipAssetId,
      txHash: registrationResult.txHash,
      registeredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('IP registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register IP asset' },
      { status: 500 }
    );
  }
}