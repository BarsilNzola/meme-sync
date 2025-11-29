export interface MemeTemplate {
  id: string;
  name: string;
  imageUrl: string;
  duration: number;
  frameCount: number;
  defaultTiming: number[];
}

export interface MemeProject {
  id: string;
  meme: MemeTemplate;
  audio: AudioTrack;
  syncPoints: number[];
  outputUrl?: string;
  ipAssetId?: string;
  txHash?: string;
  createdAt: Date;
}