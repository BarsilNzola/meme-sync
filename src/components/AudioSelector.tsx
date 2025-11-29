'use client';

import { useState, useCallback } from 'react';
import { Music, Play, Square, Upload, Volume2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AudioTrack } from '@/types/Audio';
import { uploadAudio } from '@/lib/storage';

interface AudioSelectorProps {
  onAudioSelect: (audio: AudioTrack) => void;
}

const defaultAudioTracks: AudioTrack[] = [
  {
    id: 'beat_1',
    name: 'Synthwave Beat',
    url: 'https://uatxiqonhdguqcqqlisl.supabase.co/storage/v1/object/public/audio/synthwave.mp3',
    duration: 15,
    bpm: 128,
    beats: [0, 0.46875, 0.9375, 1.40625, 1.875],
    format: 'mp3',
  },
  {
    id: 'beat_2',
    name: 'Hip Hop Loop',
    url: 'https://uatxiqonhdguqcqqlisl.supabase.co/storage/v1/object/public/audio/hiphop.mp3',
    duration: 12,
    bpm: 95,
    beats: [0, 0.63158, 1.26316, 1.89474, 2.52632],
    format: 'mp3',
  },
  {
    id: 'beat_3',
    name: 'Electronic Pulse',
    url: 'https://uatxiqonhdguqcqqlisl.supabase.co/storage/v1/object/public/audio/electronic.mp3',
    duration: 10,
    bpm: 140,
    beats: [0, 0.42857, 0.85714, 1.28571, 1.71429],
    format: 'mp3',
  },
];

export default function AudioSelector({ onAudioSelect }: AudioSelectorProps) {
  const [selectedAudio, setSelectedAudio] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleAudioSelect = (audio: AudioTrack) => {
    setSelectedAudio(audio);
    onAudioSelect(audio);
  };

  const handlePlayPause = (audio: AudioTrack) => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setIsPlaying(false);
    }

    if (!isPlaying || selectedAudio?.id !== audio.id) {
      const audioElement = new Audio(audio.url);
      audioElement.play();
      setCurrentAudio(audioElement);
      setIsPlaying(true);
      
      audioElement.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
      };
    }
  };

  const generateNewAudio = async (mood: string) => {
    setIsGenerating(mood);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: `Create ${mood.toLowerCase()} background music for a meme video`,
          duration: 15,
          mood: mood.toLowerCase(),
          tempo: getTempoForMood(mood)
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const newAudioTrack: AudioTrack = {
          id: `generated_${Date.now()}`,
          name: `AI ${mood} Track`,
          url: result.audioUrl,
          duration: result.duration || 15,
          bpm: result.bpm || getTempoForMood(mood),
          beats: result.beats || generatePlaceholderBeats(15, result.bpm || getTempoForMood(mood)),
          format: result.format || 'mp3',
        };
        
        handleAudioSelect(newAudioTrack);
      } else {
        throw new Error(result.error || 'Failed to generate audio');
      }
    } catch (error) {
      console.error('Failed to generate audio:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));
    
    if (audioFile) {
      handleFileUpload(audioFile);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file (MP3, WAV, etc.)');
      return;
    }

    setIsUploading(true);
    try {
      // Upload to Supabase Storage
      const audioUrl = await uploadAudio(file);
      
      // Create a temporary audio element to get duration
      const tempAudio = new Audio();
      tempAudio.src = URL.createObjectURL(file);
      
      tempAudio.onloadedmetadata = () => {
        const customAudio: AudioTrack = {
          id: `custom_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
          url: audioUrl,
          duration: Math.round(tempAudio.duration),
          bpm: 120, // Default BPM - you could analyze this later
          beats: generatePlaceholderBeats(Math.round(tempAudio.duration), 120),
          format: file.name.split('.').pop() as 'mp3' | 'wav',
        };
        
        handleAudioSelect(customAudio);
        setIsUploading(false);
      };
      
      tempAudio.onerror = () => {
        // Fallback if we can't get duration
        const customAudio: AudioTrack = {
          id: `custom_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ""),
          url: audioUrl,
          duration: 15, // Default duration
          bpm: 120,
          beats: generatePlaceholderBeats(15, 120),
          format: file.name.split('.').pop() as 'mp3' | 'wav',
        };
        
        handleAudioSelect(customAudio);
        setIsUploading(false);
      };
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload audio file. Please try again.');
      setIsUploading(false);
    }
  };

  const getTempoForMood = (mood: string): number => {
    const tempoMap: { [key: string]: number } = {
      'epic': 120,
      'funny': 140,
      'dramatic': 80,
      'happy': 130,
      'sad': 70,
      'suspense': 100,
    };
    return tempoMap[mood.toLowerCase()] || 120;
  };

  const generatePlaceholderBeats = (duration: number, bpm: number): number[] => {
    const beats: number[] = [];
    const beatInterval = 60 / bpm;
    
    for (let time = 0; time < duration; time += beatInterval) {
      beats.push(time);
    }
    
    return beats;
  };

  return (
    <Card className="bg-background/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground">Select Audio Track</CardTitle>
        <CardDescription className="text-muted-foreground">
          Choose from existing tracks, upload your own, or generate AI audio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Default Audio Tracks */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Available Tracks</h3>
          <div className="space-y-3">
            {defaultAudioTracks.map((audio) => (
              <div
                key={audio.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                  selectedAudio?.id === audio.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleAudioSelect(audio)}
              >
                <div className="flex items-center space-x-4">
                  <Music className="w-6 h-6 text-primary" />
                  <div>
                    <div className="text-foreground font-medium">{audio.name}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {audio.bpm} BPM
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {audio.duration}s
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPause(audio);
                  }}
                >
                  {isPlaying && selectedAudio?.id === audio.id ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Upload Audio Section */}
        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Upload Your Audio</h3>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer ${
              isDragging 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            } ${isUploading ? 'opacity-50' : ''}`}
          >
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <div className="text-foreground font-medium mb-2">
              {isUploading ? 'Uploading...' : 'Drag & drop your audio file'}
            </div>
            <div className="text-muted-foreground text-sm mb-4">
              or click to browse files (MP3, WAV, etc.)
            </div>
            <input
              type="file"
              accept="audio/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(file);
                }
              }}
              disabled={isUploading}
            />
            {isUploading && (
              <div className="flex items-center justify-center space-x-2 mt-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </div>
            )}
          </div>
        </div>

        {/* AI Audio Generation */}
        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Generate AI Audio</h3>
          <div className="flex flex-wrap gap-2">
            {['Epic', 'Funny', 'Dramatic', 'Happy', 'Sad', 'Suspense'].map((mood) => (
              <Button
                key={mood}
                variant="secondary"
                onClick={() => generateNewAudio(mood)}
                disabled={isGenerating === mood}
                className="rounded-full"
              >
                {isGenerating === mood ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  mood
                )}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}