import sharp from 'sharp';

export interface MemeProcessingOptions {
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
  overlayText?: {
    text: string;
    position: 'top' | 'bottom' | 'center';
    fontSize?: number;
    color?: string;
    strokeColor?: string;
  };
}

export async function processMemeImage(
  imageBuffer: Buffer,
  options: MemeProcessingOptions = {}
): Promise<Buffer> {
  const {
    width = 640,
    height = 640,
    format = 'jpeg',
    quality = 80,
    overlayText
  } = options;

  let image = sharp(imageBuffer)
    .resize(width, height, {
      fit: 'cover',
      position: 'center'
    });

  // Add text overlay if specified
  if (overlayText) {
    image = await addTextOverlay(image, overlayText);
  }

  // Convert to specified format
  switch (format) {
    case 'jpeg':
      return image.jpeg({ quality }).toBuffer();
    case 'png':
      return image.png().toBuffer();
    case 'webp':
      return image.webp({ quality }).toBuffer();
    default:
      return image.jpeg({ quality }).toBuffer();
  }
}

async function addTextOverlay(
  image: sharp.Sharp,
  textOptions: NonNullable<MemeProcessingOptions['overlayText']>
): Promise<sharp.Sharp> {
  const {
    text,
    position = 'bottom',
    fontSize = 32,
    color = 'white',
    strokeColor = 'black'
  } = textOptions;

  // Create SVG text overlay
  const svgText = `
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <style>
        .meme-text {
          font-family: Impact, Arial, sans-serif;
          font-size: ${fontSize}px;
          fill: ${color};
          stroke: ${strokeColor};
          stroke-width: 2;
          stroke-linejoin: round;
          font-weight: bold;
          text-anchor: middle;
          dominant-baseline: central;
        }
      </style>
      <text x="50%" y="${
        position === 'top' ? '15%' : 
        position === 'bottom' ? '85%' : '50%'
      }" class="meme-text">${text}</text>
    </svg>
  `;

  const svgBuffer = Buffer.from(svgText);
  
  return image.composite([
    {
      input: svgBuffer,
      top: 0,
      left: 0
    }
  ]);
}

export async function extractFramesFromVideo(
  videoPath: string,
  timestamps: number[]
): Promise<Buffer[]> {
  const frames: Buffer[] = [];
  
  for (const timestamp of timestamps) {
    const frame = await extractFrameAtTime(videoPath, timestamp);
    frames.push(frame);
  }
  
  return frames;
}

async function extractFrameAtTime(videoPath: string, timestamp: number): Promise<Buffer> {
  // This would use ffmpeg to extract a frame at the specific timestamp
  // For now, return a placeholder implementation
  const { getVideoMetadata } = await import('./ffmpeg-server');
  const metadata = await getVideoMetadata(videoPath);
  
  // Create a placeholder frame with timestamp info
  const placeholderSvg = `
    <svg width="${metadata.resolution.width}" height="${metadata.resolution.height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#333"/>
      <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle">
        Frame at ${timestamp}s
      </text>
    </svg>
  `;
  
  return Buffer.from(placeholderSvg);
}

export async function detectFaces(imageBuffer: Buffer): Promise<{ x: number; y: number; width: number; height: number }[]> {
  // In a real implementation, you'd use a face detection library like:
  // - @tensorflow-models/blazeface
  // - face-api.js
  // - OpenCV
  
  // Placeholder implementation
  const metadata = await sharp(imageBuffer).metadata();
  
  // Return mock face detection results
  return [
    {
      x: Math.floor(metadata.width! * 0.25),
      y: Math.floor(metadata.height! * 0.25),
      width: Math.floor(metadata.width! * 0.5),
      height: Math.floor(metadata.height! * 0.5)
    }
  ];
}

export async function createMemeCollage(
  imageBuffers: Buffer[],
  options: { columns?: number; spacing?: number; backgroundColor?: string } = {}
): Promise<Buffer> {
  const { columns = 2, spacing = 10, backgroundColor = 'white' } = options;
  
  if (imageBuffers.length === 0) {
    throw new Error('No images provided for collage');
  }
  
  const images = await Promise.all(
    imageBuffers.map(buffer => sharp(buffer).resize(300, 300).toBuffer())
  );
  
  const rows = Math.ceil(images.length / columns);
  const collageWidth = columns * 300 + (columns - 1) * spacing;
  const collageHeight = rows * 300 + (rows - 1) * spacing;
  
  const compositeOperations = [];
  
  for (let i = 0; i < images.length; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;
    
    compositeOperations.push({
      input: images[i],
      top: row * (300 + spacing),
      left: col * (300 + spacing)
    });
  }
  
  return sharp({
    create: {
      width: collageWidth,
      height: collageHeight,
      channels: 3,
      background: backgroundColor
    }
  })
    .composite(compositeOperations)
    .jpeg()
    .toBuffer();
}