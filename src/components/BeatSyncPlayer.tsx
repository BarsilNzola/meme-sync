'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Square, Volume2, VolumeX, Download, Video } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { SyncProject } from '@/types/Project';

interface BeatSyncPlayerProps {
  project: SyncProject & { 
    videoUrl?: string;
    memeImageUrl?: string;
    audioUrl?: string;
  };
  audioUrl: string;
  memeUrl: string;
  duration: number;
}

export default function BeatSyncPlayer({ 
  project, 
  audioUrl: propAudioUrl, 
  memeUrl: propMemeUrl, 
  duration 
}: BeatSyncPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Use props or fallback to project data
  const memeUrl = propMemeUrl || project.memeImageUrl || '';
  const audioUrl = propAudioUrl || project.audioUrl || '';
  const videoUrl = project.outputUri || project.videoUrl || '';

  useEffect(() => {
    // Check if project has an export URL from database
    if (project.outputUri) {
      setHasVideo(true);
    }
  }, [project.outputUri]);

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

  // Video event handlers
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      const updateVideoTime = () => {
        setCurrentTime(video.currentTime);
      };
      
      const handleVideoEnd = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      video.addEventListener('timeupdate', updateVideoTime);
      video.addEventListener('ended', handleVideoEnd);

      return () => {
        video.removeEventListener('timeupdate', updateVideoTime);
        video.removeEventListener('ended', handleVideoEnd);
      };
    }
  }, [hasVideo]);

  const handlePlayPause = async () => {
    if (hasVideo && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        await videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (audioRef.current) {
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
    if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
    }
  };

  const handleMuteToggle = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (hasVideo && videoRef.current) {
      videoRef.current.currentTime = newTime;
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleDownload = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `memesync-${project.id}-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `audio-${project.id}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Use the actual audio duration or fallback to the provided duration
  const actualDuration = audioDuration > 0 ? audioDuration : duration;
  const progress = actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0;

  // Use syncPoints from the project
  const syncPoints = project.syncPoints || [];

  return (
    <Card className="bg-background/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground">Preview</CardTitle>
        <CardDescription className="text-muted-foreground">
          {hasVideo 
            ? 'Watch your synced video' 
            : 'Preview your meme with audio beats'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Video/Image Preview */}
        <div className="aspect-video bg-gradient-to-br from-purple-900 to-blue-900 rounded-lg flex items-center justify-center relative overflow-hidden border-2 border-border">
          {hasVideo ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              poster={memeUrl}
              preload="metadata"
              controls={false}
            />
          ) : (
            <>
              <img
                src={memeUrl}
                alt="Meme"
                className="w-full h-full object-contain p-4"
              />
              
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
            </>
          )}
          
          {/* Video available badge */}
          {hasVideo && (
            <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Video className="w-3 h-3" />
              Video Ready
            </div>
          )}
          
          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-900/70">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-100"
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
            disabled={!audioUrl && !hasVideo}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handlePlayPause}
              size="lg"
              className="rounded-full w-12 h-12 p-0"
              disabled={(!audioUrl && !hasVideo) || actualDuration === 0}
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
                disabled={!audioUrl && !hasVideo}
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
                disabled={!audioUrl && !hasVideo}
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {videoUrl && (
              <Button
                onClick={handleDownload}
                size="sm"
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                Download Video
              </Button>
            )}
            
            <div className="text-sm text-muted-foreground text-right">
              <div>{syncPoints.length} sync points</div>
              {hasVideo && <div className="text-green-400">✓ Video Generated</div>}
            </div>
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

        {/* Hidden Audio Element (for audio-only mode) */}
        {!hasVideo && audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
            onError={(e) => console.error('Audio loading error:', e)}
          />
        )}
        
        {/* Debug info (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Meme URL: {memeUrl ? 'Loaded' : 'Missing'}</div>
            <div>Audio URL: {audioUrl ? 'Loaded' : 'Missing'}</div>
            <div>Video URL: {videoUrl ? 'Loaded' : 'Not generated'}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}