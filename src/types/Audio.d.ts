export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  duration: number;
  bpm: number;
  beats: number[];
  format: 'mp3' | 'wav';
  generatedFrom?: string;
}

export interface BeatDetectionResult {
  bpm: number;
  beats: number[];
  confidence: number;
}