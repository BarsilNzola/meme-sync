import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();
let isLoaded = false;

export async function loadFFmpeg(): Promise<void> {
  if (!isLoaded) {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    isLoaded = true;
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
  await loadFFmpeg();
  
  const { imageFiles, audioFile, duration, syncPoints, outputFormat, resolution = { width: 640, height: 640 } } = options;
  
  // Write input files to FFmpeg using new API
  const audioData = await audioFile.arrayBuffer();
  await ffmpeg.writeFile('audio.mp3', new Uint8Array(audioData));
  
  for (let i = 0; i < imageFiles.length; i++) {
    const imageData = await imageFiles[i].arrayBuffer();
    await ffmpeg.writeFile(`image${i}.jpg`, new Uint8Array(imageData));
  }
  
  // Generate filter complex for transitions
  const filterComplex = generateFilterComplex(imageFiles.length, syncPoints, duration, resolution);
  
  // Run FFmpeg command using new API
  await ffmpeg.exec([
    '-i', 'audio.mp3',
    ...imageFiles.flatMap((_, i) => ['-i', `image${i}.jpg`]),
    '-filter_complex', filterComplex,
    '-map', '[v]',
    '-map', '0:a',
    '-c:v', outputFormat === 'gif' ? 'gif' : 'libx264',
    '-c:a', 'aac',
    '-pix_fmt', 'yuv420p',
    '-shortest',
    `output.${outputFormat}`
  ]);
  
  // Read output file using new API
  const data = await ffmpeg.readFile(`output.${outputFormat}`);
  return new Blob([data], { type: `video/${outputFormat}` });
}

function generateFilterComplex(
  imageCount: number,
  syncPoints: number[],
  totalDuration: number,
  resolution: { width: number; height: number }
): string {
  const inputs = Array.from({ length: imageCount }, (_, i) => `[${i + 1}:v]`);
  const scaleFilters = inputs.map((input, i) => 
    `${input}scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=disable[img${i}];`
  ).join('');

  // Create crossfade transitions between images
  const transitionFilters = [];
  for (let i = 0; i < imageCount - 1; i++) {
    const transitionDuration = 0.5; // 0.5 second crossfade
    const transitionStart = syncPoints[i + 1] - transitionDuration;
    
    transitionFilters.push(
      `[v${i}][img${i + 1}]xfade=transition=fade:duration=${transitionDuration}:offset=${transitionStart}[v${i + 1}];`
    );
  }

  // First image
  transitionFilters.unshift(`[img0]null[v0];`);

  const finalVideo = `[v${imageCount - 1}]`;
  
  return [
    scaleFilters,
    transitionFilters.join(''),
    `${finalVideo}format=yuv420p[v]`
  ].join('');
}

export async function extractAudioWaveform(audioFile: File): Promise<number[]> {
  await loadFFmpeg();
  
  // Write audio file using new API
  const audioData = await audioFile.arrayBuffer();
  await ffmpeg.writeFile('audio.mp3', new Uint8Array(audioData));
  
  // Run FFmpeg command using new API
  await ffmpeg.exec([
    '-i', 'audio.mp3',
    '-filter_complex', 'compand,showwavespic=colors=white:split_channels=1',
    '-frames:v', '1',
    'waveform.png'
  ]);
  
  // Read output file using new API
  const data = await ffmpeg.readFile('waveform.png');
  
  // Convert image data to waveform points (simplified)
  // In a real implementation, you'd analyze the image to extract waveform data
  const waveform: number[] = [];
  const steps = 100;
  
  for (let i = 0; i < steps; i++) {
    waveform.push(Math.random() * 0.8 + 0.2); // Placeholder
  }
  
  return waveform;
}