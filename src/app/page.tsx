'use client';

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

interface ProjectWithMedia extends SyncProject {
  memeImageUrl: string;
  audioUrl: string;
}

export default function Home() {
  const { isConnected, address } = useAccount();
  const [currentProject, setCurrentProject] = useState<ProjectWithMedia | null>(null);
  const [selectedMeme, setSelectedMeme] = useState<MemeTemplate | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<AudioTrack | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Calculate duration based on selected meme and audio
  const calculateDuration = () => {
    if (!selectedMeme || !selectedAudio) return 0;
    // Use the longer duration between meme and audio
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
        // Create a project object that includes the media URLs
        const projectWithMedia = {
          ...syncResult.project,
          memeImageUrl: selectedMeme.imageUrl, // Add the meme URL
          audioUrl: selectedAudio.url, // Add the audio URL
        };
        
        setCurrentProject(projectWithMedia);
      } else {
        throw new Error('Sync completed but no project returned');
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
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
                    disabled={isSyncing}
                    size="lg"
                    className="w-full gap-2 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
                  >
                    {isSyncing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Syncing...
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
                  <CardContent className="flex justify-between items-center pt-6">
                    <ExportButton project={currentProject} />
                    <IPRegistrationBadge project={currentProject} />
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
              <div className="text-muted-foreground text-sm">{currentProject ? currentProject.status : 'Not Started'}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}