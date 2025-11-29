import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';

export interface ServerVideoCompositionOptions {
  imagePaths: string[];
  audioPath: string;
  outputPath: string;
  duration: number;
  syncPoints: number[];
  format: 'mp4' | 'webm';
  resolution?: { width: number; height: number };
}

export async function composeVideoServer(options: ServerVideoCompositionOptions): Promise<string> {
  const { imagePaths, audioPath, outputPath, duration, syncPoints, format, resolution = { width: 640, height: 640 } } = options;
  
  return new Promise((resolve, reject) => {
    let command = ffmpeg();
    
    // Add audio input
    command.input(audioPath);
    
    // Add image inputs
    imagePaths.forEach((imagePath, index) => {
      command.input(imagePath);
    });
    
    // Generate filter complex
    const filterComplex = generateServerFilterComplex(imagePaths.length, syncPoints, duration, resolution);
    
    command
      .complexFilter(filterComplex)
      .outputOptions([
        '-map', '[v]',
        '-map', '0:a',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-pix_fmt', 'yuv420p',
        '-shortest',
        '-y' // Overwrite output file
      ])
      .format(format)
      .save(outputPath)
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(new Error(`FFmpeg error: ${err.message}`));
      })
      .on('progress', (progress) => {
        console.log(`Processing: ${progress.percent}% done`);
      });
  });
}

function generateServerFilterComplex(
  imageCount: number,
  syncPoints: number[],
  totalDuration: number,
  resolution: { width: number; height: number }
): string {
  const filters: string[] = [];
  
  // Scale all images to same resolution
  for (let i = 0; i < imageCount; i++) {
    filters.push(`[${i + 1}:v]scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=disable[img${i}]`);
  }
  
  // Create concat filter with timing
  const concatInputs: string[] = [];
  for (let i = 0; i < imageCount; i++) {
    const startTime = syncPoints[i] || 0;
    const nextStartTime = syncPoints[i + 1] || totalDuration;
    const duration = nextStartTime - startTime;
    
    concatInputs.push(`[img${i}]`);
    filters.push(`[img${i}]trim=duration=${duration}[trim${i}]`);
  }
  
  // Concatenate all trimmed segments
  filters.push(`${concatInputs.map((_, i) => `[trim${i}]`).join('')}concat=n=${imageCount}:v=1:a=0[v]`);
  
  return filters.join(';');
}

export async function generateVideoThumbnail(videoPath: string, outputPath: string, timeInSeconds: number = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timeInSeconds],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '320x320'
      })
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err) => {
        reject(new Error(`Thumbnail generation failed: ${err.message}`));
      });
  });
}

export async function getVideoMetadata(videoPath: string): Promise<{ duration: number; resolution: { width: number; height: number } }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }
      
      resolve({
        duration: metadata.format.duration || 0,
        resolution: {
          width: videoStream.width || 640,
          height: videoStream.height || 640
        }
      });
    });
  });
}