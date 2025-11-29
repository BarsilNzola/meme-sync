import { NextRequest, NextResponse } from 'next/server';
import { syncMemeWithAudio } from '@/lib/video-tools';
import { createProject } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { 
      memeId, 
      audioId, 
      creator, 
      memeImageUrl, 
      memeName, 
      audioUrl, 
      audioName, 
      syncPoints 
    } = await request.json();

    console.log('Sync request received:', { memeId, audioId, creator, memeImageUrl, audioUrl });

    if (!memeId || !audioId || !creator || !memeImageUrl || !audioUrl) {
      return NextResponse.json(
        { error: 'Meme ID, Audio ID, Creator, Meme Image URL, and Audio URL are required' },
        { status: 400 }
      );
    }

    // Sync meme with audio using our video tools
    const syncResult = await syncMemeWithAudio({
      memeId: memeId.toString(),
      audioId: audioId.toString(),
      syncPoints: syncPoints || []
    });

    console.log('Sync result:', syncResult);

    // Store project in database
    const project = await createProject(
      memeId,
      memeName || 'Custom Meme',
      memeImageUrl,
      5, // memeDuration
      1, // memeFrameCount
      [0], // memeDefaultTiming
      audioId,
      audioName || 'Custom Audio',
      audioUrl,
      15, // audioDuration
      120, // audioBpm
      [], // audioBeats
      'mp3', // audioFormat
      creator,
      syncResult.syncData.beatMatches.map((match: any) => match.timestamp)
    );

    console.log('Created project:', project);

    return NextResponse.json({
      success: true,
      project,
      outputUrl: syncResult.outputUrl,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync meme with audio' },
      { status: 500 }
    );
  }
}