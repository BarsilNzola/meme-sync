import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { projectId, videoUrl } = await request.json();

    console.log('Updating project video URL:', { projectId, videoUrl });

    if (!projectId || !videoUrl) {
      return NextResponse.json(
        { error: 'Project ID and video URL are required' },
        { status: 400 }
      );
    }

    // Update project with video URL
    const { data, error } = await supabase
      .from('projects')
      .update({ 
        export_url: videoUrl,
        status: 'Exported'
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    
    // Return the updated project
    const updatedProject = {
      id: data.id,
      projectName: `${data.meme_name} + ${data.audio_name}`,
      memeId: data.meme_id,
      audioId: data.audio_id,
      creator: data.user_address,
      syncPoints: data.sync_points,
      outputUri: data.export_url || '',
      ipAssetHash: data.ip_registration_tx || '',
      status: data.status,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: Date.now(),
      memeImageUrl: data.meme_image_url,
      audioUrl: data.audio_url,
    };

    console.log('Updated project with video URL:', updatedProject.outputUri);

    return NextResponse.json(updatedProject);
  } catch (error: any) {
    console.error('Video URL update error:', error);
    return NextResponse.json(
      { error: 'Failed to update project video URL' },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';
export const dynamic = 'force-dynamic';