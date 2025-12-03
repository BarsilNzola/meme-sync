import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

// Initialize FFmpeg instance only on client side
let ffmpeg: FFmpeg | null = null;
let isLoaded = false;

// Check if we're in the browser
const isBrowser = typeof window !== 'undefined';

export async function loadFFmpeg(): Promise<void> {
  if (!isBrowser) {
    throw new Error('FFmpeg can only be loaded in the browser');
  }

  if (!isLoaded) {
    console.log('Loading FFmpeg WASM...');
    
    if (!ffmpeg) {
      ffmpeg = new FFmpeg();
    }
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    isLoaded = true;
    console.log('FFmpeg WASM loaded successfully');
  }
}

export interface VideoCompositionOptions {
  imageFiles: File[];
  audioFile: File;
  duration: number;
  syncPoints: number[];
  outputFormat: 'mp4' | 'webm' | 'gif';
  resolution?: { width: number; height: number };
}

export async function composeVideoClient(options: VideoCompositionOptions): Promise<Blob> {
  if (!isBrowser) {
    throw new Error('Video composition can only be done in the browser');
  }

  await loadFFmpeg();
  
  const { imageFiles, audioFile, duration, syncPoints, outputFormat, resolution = { width: 640, height: 640 } } = options;
  
  console.log('Starting video composition with FFmpeg WASM...');
  
  if (!ffmpeg) {
    throw new Error('FFmpeg not initialized');
  }

  try {
    // Write input files to FFmpeg
    console.log('Writing audio file to FFmpeg...');
    const audioData = await audioFile.arrayBuffer();
    await ffmpeg.writeFile('audio.mp3', new Uint8Array(audioData));
    
    console.log('Writing image files to FFmpeg...');
    for (let i = 0; i < imageFiles.length; i++) {
      const imageData = await imageFiles[i].arrayBuffer();
      await ffmpeg.writeFile(`image${i}.jpg`, new Uint8Array(imageData));
    }
    
    // Generate FFmpeg command for simple video composition
    const command = [
      '-loop', '1', // Loop the image
      '-i', 'image0.jpg', // Use first image
      '-i', 'audio.mp3', // Audio input
      '-c:v', 'libx264', // Video codec
      '-c:a', 'aac', // Audio codec
      '-t', duration.toString(), // Duration
      '-pix_fmt', 'yuv420p', // Pixel format
      '-shortest', // Finish when audio ends
      '-y', // Overwrite output
      `output.${outputFormat}`
    ];
    
    console.log('Running FFmpeg command:', command.join(' '));
    
    // Execute FFmpeg command
    await ffmpeg.exec(command);
    
    // Read output file
    console.log('Reading output file...');
    const data = await ffmpeg.readFile(`output.${outputFormat}`);
    
    // Clean up files
    console.log('Cleaning up temporary files...');
    await ffmpeg.deleteFile('audio.mp3');
    await ffmpeg.deleteFile('image0.jpg');
    await ffmpeg.deleteFile(`output.${outputFormat}`);
    
    // Simple type assertion - FFmpeg returns Uint8Array
    // @ts-ignore - Ignore TypeScript error for this line
    const blob = new Blob([data], { type: `video/${outputFormat}` });
    console.log('Video composition completed successfully');
    
    return blob;
    
  } catch (error) {
    console.error('FFmpeg composition error:', error);
    throw new Error(`Video composition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Simple waveform extraction (optional)
export async function extractAudioWaveform(audioFile: File): Promise<number[]> {
  if (!isBrowser) {
    return [];
  }

  await loadFFmpeg();
  
  if (!ffmpeg) {
    return [];
  }

  try {
    const audioData = await audioFile.arrayBuffer();
    await ffmpeg.writeFile('audio.mp3', new Uint8Array(audioData));
    
    // Simple placeholder implementation
    const waveform: number[] = [];
    const steps = 100;
    
    for (let i = 0; i < steps; i++) {
      waveform.push(Math.random() * 0.8 + 0.2);
    }
    
    await ffmpeg.deleteFile('audio.mp3');
    
    return waveform;
  } catch (error) {
    console.error('Waveform extraction error:', error);
    return [];
  }
}