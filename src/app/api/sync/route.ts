import { NextRequest, NextResponse } from 'next/server';
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

    console.log('Sync request received:', { 
      memeId, 
      audioId, 
      creator,
      memeName,
      audioName
    });

    // Validate required fields
    if (!memeId || !audioId || !creator || !memeImageUrl || !audioUrl) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['memeId', 'audioId', 'creator', 'memeImageUrl', 'audioUrl'],
          received: { memeId, audioId, creator, memeImageUrl: !!memeImageUrl, audioUrl: !!audioUrl }
        },
        { status: 400 }
      );
    }

    // Generate sync data (just metadata)
    const syncData = {
      beatMatches: Array.isArray(syncPoints) && syncPoints.length > 0 
        ? syncPoints.map((point: number, index: number) => ({
            memeFrame: index,
            audioBeat: point,
            timestamp: point,
            strength: 0.8 + Math.random() * 0.2,
          }))
        : [
            { timestamp: 0, confidence: 0.8 },
            { timestamp: 2.5, confidence: 0.9 },
            { timestamp: 5, confidence: 0.7 },
          ],
      duration: 15, // Default duration
      memeStartTime: 0,
      audioStartTime: 0,
    };

    // Store project in database (just metadata)
    const project = await createProject(
      parseInt(memeId.toString()) || 0,
      memeName || 'Custom Meme',
      memeImageUrl,
      5, // memeDuration
      1, // memeFrameCount
      [0], // memeDefaultTiming
      parseInt(audioId.toString()) || 0,
      audioName || 'Custom Audio',
      audioUrl,
      15, // audioDuration
      120, // audioBpm
      [], // audioBeats
      'mp3', // audioFormat
      creator,
      syncData.beatMatches.map((match: any) => match.timestamp)
    );

    console.log('Project created successfully:', project.id);

    return NextResponse.json({
      success: true,
      project,
      syncData,
      // No video processing here - that happens in ExportButton
      duration: syncData.duration,
    });
  } catch (error: any) {
    console.error('Sync API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync meme with audio',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';
export const dynamic = 'force-dynamic';