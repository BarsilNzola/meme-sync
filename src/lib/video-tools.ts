'use client';

import { composeVideoClient } from './ffmpeg-client';
import { storeExport } from './storage';

export interface VideoGenerationOptions {
  memeUrl: string;
  audioUrl: string;
  projectId: string;
  syncPoints: number[];
  duration: number;
  quality?: 'low' | 'medium' | 'high';
}

export interface VideoGenerationResult {
  success: boolean;
  videoUrl?: string;
  error?: string;
  fileSize?: number;
}

class VideoGenerator {
  private isProcessing = false;
  private progressCallbacks: ((progress: number) => void)[] = [];

  onProgress(callback: (progress: number) => void) {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
    };
  }

  private updateProgress(progress: number) {
    this.progressCallbacks.forEach(callback => callback(progress));
  }

  async generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
    if (this.isProcessing) {
      return { success: false, error: 'Another video is already processing' };
    }

    this.isProcessing = true;
    
    try {
      const { memeUrl, audioUrl, projectId, syncPoints, duration, quality = 'medium' } = options;
      
      this.updateProgress(10);
      
      // Download files
      const [memeResponse, audioResponse] = await Promise.all([
        fetch(memeUrl),
        fetch(audioUrl)
      ]);

      if (!memeResponse.ok) throw new Error(`Failed to download meme: ${memeResponse.statusText}`);
      if (!audioResponse.ok) throw new Error(`Failed to download audio: ${audioResponse.statusText}`);

      this.updateProgress(30);
      
      // Convert to Files
      const memeBlob = await memeResponse.blob();
      const memeFile = new File([memeBlob], 'meme.jpg', { type: 'image/jpeg' });
      
      const audioBlob = await audioResponse.blob();
      const audioFile = new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' });
      
      this.updateProgress(50);
      
      // Process with client-side FFmpeg
      const videoBlob = await composeVideoClient({
        imageFiles: [memeFile],
        audioFile: audioFile,
        duration: duration,
        syncPoints: syncPoints,
        outputFormat: 'mp4',
        resolution: this.getResolution(quality),
      });
      
      this.updateProgress(80);
      
      // Upload to Supabase
      const filename = `video_${projectId}_${Date.now()}.mp4`;
      const videoBuffer = Buffer.from(await videoBlob.arrayBuffer());
      const videoUrl = await storeExport(videoBuffer, filename);
      
      this.updateProgress(100);
      
      return {
        success: true,
        videoUrl,
        fileSize: videoBuffer.length,
      };
      
    } catch (error: any) {
      console.error('Video generation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate video',
      };
    } finally {
      this.isProcessing = false;
    }
  }

  private getResolution(quality: 'low' | 'medium' | 'high'): { width: number; height: number } {
    switch (quality) {
      case 'high':
        return { width: 1280, height: 1280 };
      case 'medium':
        return { width: 720, height: 720 };
      case 'low':
        return { width: 480, height: 480 };
      default:
        return { width: 720, height: 720 };
    }
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 
           typeof WebAssembly === 'object' &&
           !!(window as any).WebAssembly;
  }
}

// Export singleton instance
export const videoGenerator = new VideoGenerator();

// Legacy function for backward compatibility
export async function syncMemeWithAudio(options: any): Promise<any> {
  return {
    success: true,
    syncData: {
      beatMatches: [],
      duration: 15,
    },
    duration: 15,
  };
}