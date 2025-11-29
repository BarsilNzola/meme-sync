'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Square, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { SyncProject } from '@/types/Project';

interface BeatSyncPlayerProps {
  project: SyncProject;
  audioUrl: string;
  memeUrl: string;
  duration: number;
}

export default function BeatSyncPlayer({ project, audioUrl, duration }: BeatSyncPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      const updateTime = () => {
        setCurrentTime(audio.currentTime);
      };
      
      const handleLoadedMetadata = () => {
        setAudioDuration(audio.duration);
      };
      
      const handleEnd = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnd);

      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnd);
      };
    }
  }, [audioUrl]);

  const handlePlayPause = async () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Audio playback failed:', error);
      }
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  const handleMuteToggle = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Use the actual audio duration or fallback to the provided duration
  const actualDuration = audioDuration > 0 ? audioDuration : duration;
  const progress = actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0;

  // Use syncPoints from the project (this exists in your SyncProject type)
  const syncPoints = project.syncPoints || [];

  return (
    <Card className="bg-background/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground">Preview</CardTitle>
        <CardDescription className="text-muted-foreground">
          Watch your meme sync with the audio beats in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Video Preview */}
        <div className="aspect-video bg-gradient-to-br from-purple-600 to-blue-700 rounded-lg flex items-center justify-center relative overflow-hidden border-2 border-border">
          <div className="text-white text-center">
            <div className="text-2xl font-bold mb-2">Meme Preview</div>
            <div className="text-sm opacity-80">Synced with audio beats</div>
          </div>
          
          {/* Beat Indicators */}
          {syncPoints.map((timestamp, index) => {
            const beatProgress = (timestamp / actualDuration) * 100;
            const isActive = currentTime >= timestamp - 0.1 && currentTime <= timestamp + 0.1;
            
            return (
              <div
                key={index}
                className={`absolute top-0 bottom-0 w-1 transition-all duration-100 ${
                  isActive ? 'bg-yellow-400 shadow-lg shadow-yellow-400' : 'bg-white bg-opacity-30'
                }`}
                style={{ left: `${beatProgress}%` }}
              />
            );
          })}
          
          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-700">
            <div 
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{currentTime.toFixed(1)}s</span>
            <span>{actualDuration.toFixed(1)}s</span>
          </div>
          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            max={actualDuration}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handlePlayPause}
              size="lg"
              className="rounded-full w-12 h-12 p-0"
              disabled={!audioUrl}
            >
              {isPlaying ? (
                <Square className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMuteToggle}
                className="w-8 h-8"
                disabled={!audioUrl}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </Button>
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-20"
                disabled={!audioUrl}
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {syncPoints.length} sync points
          </div>
        </div>

        {/* Sync Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">{syncPoints.length}</div>
            <div className="text-xs text-muted-foreground">Sync Points</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">
              {actualDuration > 0 ? (syncPoints.length / actualDuration).toFixed(1) : '0.0'}
            </div>
            <div className="text-xs text-muted-foreground">Beats/Sec</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">{actualDuration.toFixed(1)}s</div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onError={(e) => console.error('Audio loading error:', e)}
        />
        
        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground">
            Audio URL: {audioUrl ? 'Loaded' : 'Missing'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}