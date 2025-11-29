import { NextRequest, NextResponse } from 'next/server';
import { generateAudioWithSuno } from '@/lib/audio-tools';

export async function POST(request: NextRequest) {
  try {
    const { prompt, duration, mood = 'upbeat', tempo = 120 } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Generate audio using Suno API
    const result = await generateAudioWithSuno({
      prompt,
      duration: Math.min(duration || 30, 30),
      mood,
      tempo
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    );
  }
}