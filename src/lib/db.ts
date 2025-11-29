import { supabase } from './supabase';
import { SyncProject, ProjectStatus } from '@/types/Project';

export async function createProject(
  memeId: number,
  memeName: string, 
  memeImageUrl: string,
  memeDuration: number,
  memeFrameCount: number,
  memeDefaultTiming: number[],
  audioId: number,
  audioName: string,
  audioUrl: string,
  audioDuration: number,
  audioBpm: number,
  audioBeats: number[],
  audioFormat: string,
  creator: string,
  syncPoints: number[]
): Promise<SyncProject> {
  const { data, error } = await supabase
    .from('projects')
    .insert([{
      user_address: creator,
      status: 'Synced',
      meme_id: memeId,
      meme_name: memeName,
      meme_image_url: memeImageUrl,
      meme_duration: memeDuration,
      meme_frame_count: memeFrameCount,
      meme_default_timing: memeDefaultTiming,
      audio_id: audioId,
      audio_name: audioName,
      audio_url: audioUrl,
      audio_duration: audioDuration,
      audio_bpm: audioBpm,
      audio_beats: audioBeats,
      audio_format: audioFormat,
      sync_points: syncPoints,
      ip_registered: false,
    }])
    .select()
    .single();

  if (error) throw error;
  
  return {
    id: Number(data.id),
    projectName: `${memeName} + ${audioName}`,
    memeId: data.meme_id,
    audioId: data.audio_id,
    creator: data.user_address,
    syncPoints: data.sync_points,
    outputUri: data.export_url || '',
    ipAssetHash: data.ip_registration_tx || '',
    status: data.status as ProjectStatus,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: Date.now(),
  };
}

export async function getProjectById(id: string): Promise<(SyncProject & { memeImageUrl: string; audioUrl: string }) | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  
  // Return both the SyncProject and the additional URLs
  return {
    id: Number(data.id),
    projectName: `${data.meme_name} + ${data.audio_name}`,
    memeId: data.meme_id,
    audioId: data.audio_id,
    creator: data.user_address,
    syncPoints: data.sync_points,
    outputUri: data.export_url || '',
    ipAssetHash: data.ip_registration_tx || '',
    status: data.status as ProjectStatus,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: Date.now(),
    memeImageUrl: data.meme_image_url,
    audioUrl: data.audio_url,
  };
}

export async function updateProjectExportUrl(projectId: string, exportUrl: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ 
      export_url: exportUrl,
      status: 'Exported'
    })
    .eq('id', projectId);

  if (error) throw error;
}

export async function updateProjectIPRegistration(projectId: string, ipAssetHash: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ 
      ip_registration_tx: ipAssetHash,
      ip_registered: true,
      status: 'Registered'
    })
    .eq('id', projectId);

  if (error) throw error;
}

export async function getProjectMediaUrls(projectId: string): Promise<{ memeImageUrl: string; audioUrl: string } | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('meme_image_url, audio_url')
    .eq('id', projectId)
    .single();

  if (error) return null;
  
  return {
    memeImageUrl: data.meme_image_url,
    audioUrl: data.audio_url,
  };
}