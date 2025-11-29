import { supabase } from './supabase';

// Upload meme image
export async function uploadMeme(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('memes')
    .upload(fileName, file);

  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('memes')
    .getPublicUrl(data.path);

  return publicUrl;
}

// Upload audio file
export async function uploadAudio(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('audio')
    .upload(fileName, file);

  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('audio')
    .getPublicUrl(data.path);

  return publicUrl;
}

// Store exported video
export async function storeExport(videoBuffer: Buffer, filename: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('exports')
    .upload(filename, videoBuffer);

  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('exports')
    .getPublicUrl(data.path);

  return publicUrl;
}

// Delete temporary files
export async function cleanupTempFiles(): Promise<void> {
  const { data: files } = await supabase.storage
    .from('temp')
    .list();
  
  if (files) {
    // Delete files older than 1 hour
    const oldFiles = files.filter(file => {
      const fileTime = new Date(file.created_at).getTime();
      return Date.now() - fileTime > 3600000; // 1 hour
    });
    
    const pathsToDelete = oldFiles.map(file => file.name);
    
    if (pathsToDelete.length > 0) {
      await supabase.storage
        .from('temp')
        .remove(pathsToDelete);
    }
  }
}