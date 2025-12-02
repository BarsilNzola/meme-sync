'use client';

import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { SyncProject } from '@/types/Project';
import { useToast } from '@/hooks/use-toast';
import { registerIPAsset } from '@/lib/story-sdk';
import { updateProjectIPRegistration } from '@/lib/db';

interface ProjectWithMedia extends SyncProject {
  memeImageUrl: string;
  audioUrl: string;
}

interface IPRegistrationBadgeProps {
  project: ProjectWithMedia;
}

export default function IPRegistrationBadge({ project }: IPRegistrationBadgeProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ipAssetId, setIpAssetId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('IPRegistrationBadge - Project:', project);
    console.log('IPRegistrationBadge - outputUri:', project.outputUri);
    console.log('IPRegistrationBadge - Can register:', !!project.outputUri);
  }, [project]);

  const handleRegister = async () => {
    if (!address || !walletClient) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to register IP assets.',
        variant: 'destructive',
      });
      return;
    }
  
    // CHECK NETWORK FIRST
    const storyAeneidChainId = 1315;
  if (chainId !== storyAeneidChainId) {
    toast({
      title: 'Wrong Network',
      description: `Please switch to Story Aeneid (Chain ID: ${storyAeneidChainId}) before registering.`,
      variant: 'destructive',
      duration: 10000,
    });
    return;
  }

    setIsRegistering(true);
    setError(null);

    try {
      // First, ensure project is exported and has output
      if (!project.outputUri) {
        throw new Error('Project must be exported before IP registration');
      }

      // Prepare metadata for IP registration
      const metadata = {
        name: project.projectName,
        description: `MemeSync creation: ${project.projectName}`,
        image: project.memeImageUrl,
        audio: project.audioUrl,
        animation_url: project.outputUri,
        attributes: [
          {
            trait_type: "Duration",
            value: "15"
          },
          {
            trait_type: "Sync Points", 
            value: project.syncPoints.length.toString()
          },
          {
            trait_type: "Creation Date",
            value: new Date(project.createdAt).toISOString()
          },
          {
            trait_type: "Creator",
            value: address
          },
          {
            trait_type: "Project ID",
            value: project.id.toString() // Convert to string
          }
        ],
        external_url: "https://memesync.xyz",
        properties: {
          meme_template: project.memeId.toString(),
          audio_track: project.audioId.toString(),
          sync_points: project.syncPoints,
          frame_count: project.syncPoints.length
        }
      };

      // Upload metadata to IPFS
      toast({
        title: 'Uploading Metadata',
        description: 'Preparing metadata for IPFS storage...',
      });

      const metadataUri = await uploadMetadataToIPFS(metadata);

      // Register directly with Story Protocol
      toast({
        title: 'Registering IP Asset',
        description: 'Creating your IP asset on Story Protocol...',
      });

      console.log('Starting Story Protocol registration...', {
        projectId: project.id,
        outputUri: project.outputUri,
        metadataUri
      });

      const registrationResult = await registerIPAsset({
        projectId: project.id.toString(),
        projectName: project.projectName,
        memeId: project.memeId.toString(),
        outputUri: project.outputUri,
        metadataUri: metadataUri,
        walletClient,
      });

      console.log('Story Protocol registration successful:', registrationResult);

      // Update project in database with IP registration details
      try {
        // Convert project.id to string to match the function signature
        await updateProjectIPRegistration(project.id.toString(), registrationResult.txHash);
        console.log('Project updated in database with IP registration');
      } catch (dbError) {
        console.warn('Failed to update project in database, but IP registration was successful:', dbError);
      }

      setIpAssetId(registrationResult.ipAssetId);
      setTxHash(registrationResult.txHash);
      
      toast({
        title: 'IP Asset Registered!',
        description: 'Your meme has been successfully registered on Story Protocol.',
      });

    } catch (error) {
      console.error('IP registration failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setError(errorMessage);
      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const uploadMetadataToIPFS = async (metadata: any): Promise<string> => {
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('IPFS upload failed:', errorText);
        throw new Error(`IPFS upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.ipfsUri;
    } catch (error) {
      console.error('IPFS upload error:', error);
      
      // In development, return a mock URI instead of failing completely
      if (process.env.NODE_ENV === 'development') {
        console.warn('Using fallback mock IPFS URI due to upload error');
        return `ipfs://mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      throw new Error('Failed to upload metadata to IPFS');
    }
  };

  // Add a refresh button to manually check the project status
  const handleRefreshProject = async () => {
    try {
      const response = await fetch(`/api/projects/${project.id}`);
      if (response.ok) {
        const updatedProject = await response.json();
        toast({
          title: 'Project Refreshed',
          description: 'Project data has been updated.',
        });
        console.log('Refreshed project:', updatedProject);
      }
    } catch (error) {
      console.error('Failed to refresh project:', error);
    }
  };

  if (ipAssetId) {
    return (
      <Card className="bg-background/50 backdrop-blur-sm border-border/50 w-full">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl md:text-2xl font-bold text-foreground">IP Asset Registered</CardTitle>
          <CardDescription className="text-muted-foreground text-sm md:text-base">
            Your meme has been successfully registered on Story Protocol
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Registered on Story Protocol</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="break-all">
              <div className="text-muted-foreground">Asset ID</div>
              <div className="font-mono text-xs md:text-sm truncate">{ipAssetId}</div>
            </div>
            <div className="break-all">
              <div className="text-muted-foreground">Transaction</div>
              <div className="font-mono text-xs md:text-sm truncate">{txHash}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://testnet.storyprotocol.xyz/ipa/${ipAssetId}`, '_blank')}
              className="gap-2 flex-1 justify-center"
            >
              <ExternalLink className="w-4 h-4" />
              View on Story
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank')}
              className="gap-2 flex-1 justify-center"
            >
              <ExternalLink className="w-4 h-4" />
              View on Etherscan
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-background/50 backdrop-blur-sm border-border/50 w-full">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-400">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Registration Failed</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2 break-words">{error}</p>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              onClick={handleRegister}
              disabled={isRegistering}
              className="gap-2 flex-1 justify-center"
              variant="outline"
            >
              <Shield className="w-4 h-4" />
              Try Again
            </Button>
            <Button
              onClick={handleRefreshProject}
              variant="outline"
              size="sm"
              className="flex-1 justify-center"
            >
              Refresh Project
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/50 backdrop-blur-sm border-border/50 w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold text-foreground">Register IP Asset</CardTitle>
        <CardDescription className="text-muted-foreground text-sm md:text-base">
          Register your meme creation as an IP asset on Story Protocol to protect your work
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-medium">Story Protocol Registration</span>
          <Badge variant="secondary" className="hidden sm:inline">On-Chain</Badge>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="break-words">• Register your meme as a unique IP asset</p>
          <p className="break-words">• Set royalties for future usage</p>
          <p className="break-words">• Protect your creative work on-chain</p>
          <p className="break-words">• License your content to others</p>
        </div>

        {/* Debug Info - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <div className="font-semibold text-yellow-800">Debug Info:</div>
            <div className="break-all">Project ID: {project.id}</div>
            <div className="break-all">Output URI: {project.outputUri || 'Not set'}</div>
            <div>Status: {project.status}</div>
          </div>
        )}

        <Button
          onClick={handleRegister}
          disabled={isRegistering || !project.outputUri}
          className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
          size="lg"
        >
          {isRegistering ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Registering...</span>
              <span className="sm:hidden">Registering</span>
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Register on Story Protocol</span>
              <span className="sm:hidden">Register IP</span>
            </>
          )}
        </Button>

        {!project.outputUri && (
          <div className="space-y-2">
            <p className="text-sm text-yellow-600 text-center">
              Project must be exported before IP registration
            </p>
            <Button
              onClick={handleRefreshProject}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Refresh Project Status
            </Button>
          </div>
        )}

        {isRegistering && (
          <div className="text-xs text-muted-foreground text-center">
            This may take a few moments. Please don't close this window.
          </div>
        )}
      </CardContent>
    </Card>
  );
}