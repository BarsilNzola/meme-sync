'use client';

export interface VideoProcessingOptions {
  memeUrl: string;
  audioUrl: string;
  projectId: string;
  syncPoints: number[];
  duration: number;
  format?: 'mp4' | 'webm' | 'gif';
  quality?: 'low' | 'medium' | 'high';
}

export interface ProcessingResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  fileSize?: number;
}

// Helper function used by ExportButton
export async function processVideoForExport(
  memeUrl: string,
  audioUrl: string,
  projectId: string,
  syncPoints: number[],
  format: 'mp4' | 'webm' | 'gif' = 'mp4',
  quality: 'low' | 'medium' | 'high' = 'medium'
): Promise<ProcessingResult> {
  try {
    console.log('Processing video for export:', { projectId, quality, format });
    
    
    return {
      success: true,
      // ExportButton will handle the actual processing
      downloadUrl: '', // Placeholder
    };
  } catch (error: any) {
    console.error('Video processing error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process video',
    };
  }
}

// Keep browser compatibility check
export function isFFmpegSupported(): boolean {
  return typeof window !== 'undefined' && 
         typeof WebAssembly === 'object' &&
         !!(window as any).WebAssembly;
}