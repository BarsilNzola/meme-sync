'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import MemeUploader from '@/components/MemeUploader';
import AudioSelector from '@/components/AudioSelector';
import BeatSyncPlayer from '@/components/BeatSyncPlayer';
import TimelineEditor from '@/components/TimelineEditor';
import ExportButton from '@/components/ExportButton';
import IPRegistrationBadge from '@/components/IPRegistrationBadge';
import WalletConnect from '@/components/WalletConnect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowRight } from 'lucide-react';
import { MemeTemplate } from '@/types/Meme';
import { AudioTrack } from '@/types/Audio';
import { SyncProject } from '@/types/Project';
import { useToast } from '@/hooks/use-toast';
import { videoGenerator } from '@/lib/video-tools';

interface ProjectWithMedia extends SyncProject {
  memeImageUrl: string;
  audioUrl: string;
  videoUrl?: string;
}

export default function Home() {
  const { isConnected, address } = useAccount();
  const [currentProject, setCurrentProject] = useState<ProjectWithMedia | null>(null);
  const [selectedMeme, setSelectedMeme] = useState<MemeTemplate | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<AudioTrack | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate duration based on selected meme and audio
  const calculateDuration = () => {
    if (!selectedMeme || !selectedAudio) return 0;
    return Math.max(selectedMeme.duration, selectedAudio.duration);
  };

  // Reset project when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setCurrentProject(null);
      setSelectedMeme(null);
      setSelectedAudio(null);
    }
  }, [isConnected]);

  const handleMemeSelect = (meme: MemeTemplate) => {
    setSelectedMeme(meme);
  };

  const handleAudioSelect = (audio: AudioTrack) => {
    setSelectedAudio(audio);
  };

  const handleSync = async () => {
    if (!selectedMeme || !selectedAudio || !address) return;
    
    setIsSyncing(true);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memeId: selectedMeme.id,
          audioId: selectedAudio.id,
          creator: address,
          memeImageUrl: selectedMeme.imageUrl,
          memeName: selectedMeme.name,
          audioUrl: selectedAudio.url,
          audioName: selectedAudio.name,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }
      
      const syncResult = await response.json();
      console.log('Sync result from API:', syncResult);
      
      if (syncResult.success && syncResult.project) {
        // Create project object with media URLs
        const projectWithMedia = {
          ...syncResult.project,
          memeImageUrl: selectedMeme.imageUrl,
          audioUrl: selectedAudio.url,
        };
        
        setCurrentProject(projectWithMedia);
        
        toast({
          title: 'Project Synced!',
          description: 'Generating video preview...',
        });
        
        // Start video generation
        setIsGeneratingVideo(true);
        setVideoProgress(0);
        
        // Setup progress listener
        const unsubscribe = videoGenerator.onProgress(setVideoProgress);
        
        const videoResult = await videoGenerator.generateVideo({
          memeUrl: selectedMeme.imageUrl,
          audioUrl: selectedAudio.url,
          projectId: syncResult.project.id,
          syncPoints: syncResult.syncData.beatMatches.map((match: any) => match.timestamp),
          duration: syncResult.syncData.duration,
          quality: 'medium',
        });
        
        unsubscribe();
        setIsGeneratingVideo(false);
        
        if (videoResult.success && videoResult.videoUrl) {
          // Update project with video URL in database
          const updateResponse = await fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: syncResult.project.id,
              videoUrl: videoResult.videoUrl,
            }),
          });
          
          let updatedProject = projectWithMedia;
          if (updateResponse.ok) {
            updatedProject = await updateResponse.json();
          }
          
          // Update local state with video URL
          setCurrentProject({
            ...updatedProject,
            videoUrl: videoResult.videoUrl,
            outputUri: videoResult.videoUrl,
          });
          
          toast({
            title: 'Video Ready!',
            description: 'Your synced video is ready to preview and register.',
          });
        } else {
          throw new Error(videoResult.error || 'Failed to generate video');
        }
      } else {
        throw new Error('Sync completed but no project returned');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync meme with audio',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
      setIsGeneratingVideo(false);
    }
  };
  
  const getAudioUrl = () => {
    if (!selectedAudio) return '';
    return selectedAudio.url;
  };
  
  const getMemeUrl = () => {
    if (!selectedMeme) return '';
    return selectedMeme.imageUrl;
  };

  const handleProjectUpdate = (updatedProject: ProjectWithMedia) => {
    setCurrentProject(updatedProject);
  };

  // Don't render anything until mounted
  if (!mounted) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-6xl font-bold gradient-text mb-4">
                MemeSync
              </h1>
              <p className="text-xl text-gray-300">
                Loading...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!isConnected) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold gradient-text mb-4">
              MemeSync
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Sync memes with AI-generated audio and register on Story Protocol
            </p>
          </div>

          {/* Connect Wallet Card */}
          <Card className="bg-background/50 backdrop-blur-sm border-border/50 max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Connect Your Wallet
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Connect your wallet to start creating and syncing memes with AI audio
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <WalletConnect />
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Card className="bg-background/30 backdrop-blur-sm border-border/30">
              <CardHeader>
                <CardTitle className="text-foreground">Create</CardTitle>
                <CardDescription>Upload memes and generate AI audio</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-background/30 backdrop-blur-sm border-border/30">
              <CardHeader>
                <CardTitle className="text-foreground">Sync</CardTitle>
                <CardDescription>Perfectly sync audio beats with meme timing</CardDescription>
              </CardHeader>
            </Card>
            <Card className="bg-background/30 backdrop-blur-sm border-border/30">
              <CardHeader>
                <CardTitle className="text-foreground">Register</CardTitle>
                <CardDescription>Mint your creation as an IP asset on Story Protocol</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Wallet */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-6xl font-bold gradient-text mb-4">
              MemeSync
            </h1>
            <p className="text-xl text-gray-300">
              Welcome back! Ready to create something amazing?
            </p>
          </div>
          <WalletConnect />
        </div>

        {/* Video Generation Progress */}
        {isGeneratingVideo && (
          <Card className="bg-background/50 backdrop-blur-sm border-border/50 mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-foreground">
                Generating Video
              </CardTitle>
              <CardDescription>
                Creating your synced meme video...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Processing video...</div>
                  <div className="text-sm font-medium">{videoProgress}%</div>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${videoProgress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Video processing happens in your browser using FFmpeg WebAssembly.
                  This may take a moment depending on video length.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Workflow */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-foreground">
                  1. Choose Meme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MemeUploader onMemeSelect={handleMemeSelect} />
              </CardContent>
            </Card>

            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-foreground">
                  2. Select Audio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AudioSelector onAudioSelect={handleAudioSelect} />
              </CardContent>
            </Card>

            {selectedMeme && selectedAudio && (
              <Card className="bg-background/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-foreground">
                    3. Sync & Create
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleSync}
                    disabled={isSyncing || isGeneratingVideo}
                    size="lg"
                    className="w-full gap-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                  >
                    {isSyncing || isGeneratingVideo ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {isGeneratingVideo ? 'Generating Video...' : 'Syncing...'}
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-5 h-5" />
                        Sync Meme with Audio
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Preview & Timeline */}
          <div className="space-y-6">
            {currentProject && (
              <>
                <Card className="bg-background/50 backdrop-blur-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-foreground">
                      Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BeatSyncPlayer 
                      project={currentProject} 
                      audioUrl={getAudioUrl()}
                      memeUrl={getMemeUrl()}
                      duration={calculateDuration()}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-background/50 backdrop-blur-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-foreground">
                      Timeline Editor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimelineEditor 
                      project={currentProject} 
                      duration={calculateDuration()} 
                    />
                  </CardContent>
                </Card>

                <Card className="bg-background/50 backdrop-blur-sm border-border/50">
                  <CardContent className="flex flex-col lg:flex-row justify-between items-center gap-6 pt-6">
                    <div className="w-full lg:w-auto">
                      <ExportButton 
                        project={currentProject} 
                        onExportComplete={handleProjectUpdate} 
                      />
                    </div>
                    <div className="w-full lg:w-auto">
                      <IPRegistrationBadge project={currentProject} />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <Card className={`bg-background/30 ${selectedMeme ? 'border-green-500' : ''}`}>
            <CardContent className="p-4">
              <div className="text-foreground font-semibold">Meme Selected</div>
              <div className="text-muted-foreground text-sm">{selectedMeme ? selectedMeme.name : 'None'}</div>
            </CardContent>
          </Card>
          
          <Card className={`bg-background/30 ${selectedAudio ? 'border-green-500' : ''}`}>
            <CardContent className="p-4">
              <div className="text-foreground font-semibold">Audio Selected</div>
              <div className="text-muted-foreground text-sm">{selectedAudio ? selectedAudio.name : 'None'}</div>
            </CardContent>
          </Card>
          
          <Card className={`bg-background/30 ${currentProject ? 'border-green-500' : ''}`}>
            <CardContent className="p-4">
              <div className="text-foreground font-semibold">Project Status</div>
              <div className="text-muted-foreground text-sm">
                {isGeneratingVideo ? 'Generating Video...' : currentProject?.status || 'Not Started'}
              </div>
              {currentProject?.videoUrl && (
                <div className="text-xs text-green-400 mt-1">✓ Video Ready</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}