'use client';

import { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, ExternalLink, Loader2, Copy, Check } from 'lucide-react';
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
  videoUrl?: string;
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
  const [copiedField, setCopiedField] = useState<'assetId' | 'txHash' | null>(null);

  // Use videoUrl if available, otherwise fallback to outputUri
  const videoUrl = project.videoUrl || project.outputUri;

  const canRegister = !!videoUrl;

  const copyToClipboard = async (text: string, field: 'assetId' | 'txHash') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: 'Copied!',
        description: `${field === 'assetId' ? 'Asset ID' : 'Transaction hash'} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const truncateAddress = (address: string, start = 6, end = 4) => {
    if (!address) return '';
    if (address.length <= start + end) return address;
    return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
  };

  const handleRegister = async () => {
    if (!address || !walletClient) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to register IP assets.',
        variant: 'destructive',
      });
      return;
    }
  
    // Check network
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
      // Ensure video is available
      if (!canRegister) {
        throw new Error('Video must be generated before IP registration');
      }

      // Prepare metadata
      const metadata = {
        name: project.projectName,
        description: `MemeSync creation: ${project.projectName}`,
        image: project.memeImageUrl,
        audio: project.audioUrl,
        animation_url: videoUrl,
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
            value: project.id.toString()
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

      toast({
        title: 'Uploading Metadata',
        description: 'Preparing metadata for IPFS storage...',
      });

      const metadataUri = await uploadMetadataToIPFS(metadata);

      toast({
        title: 'Registering IP Asset',
        description: 'Creating your IP asset on Story Protocol...',
      });

      console.log('Starting Story Protocol registration...', {
        projectId: project.id,
        videoUrl,
        metadataUri
      });

      const registrationResult = await registerIPAsset({
        projectId: project.id.toString(),
        projectName: project.projectName,
        memeId: project.memeId.toString(),
        outputUri: videoUrl,
        metadataUri: metadataUri,
        walletClient,
      });

      console.log('Story Protocol registration successful:', registrationResult);

      // Update project in database
      try {
        await updateProjectIPRegistration(project.id.toString(), registrationResult.txHash);
        console.log('Project updated in database with IP registration');
      } catch (dbError) {
        console.warn('Failed to update project in database:', dbError);
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
        throw new Error(`IPFS upload failed: ${response.status}`);
      }

      const result = await response.json();
      return result.ipfsUri;
    } catch (error) {
      console.error('IPFS upload error:', error);
      
      // Development fallback
      if (process.env.NODE_ENV === 'development') {
        console.warn('Using mock IPFS URI');
        return `ipfs://mock-${Date.now()}`;
      }
      
      throw error;
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

  if (ipAssetId && txHash) {
    return (
      <Card className="bg-background/50 backdrop-blur-sm border-border/50 w-full">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
              </div>
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl sm:text-2xl font-bold text-foreground flex flex-wrap items-center gap-2">
                IP Asset Registered
                <Badge className="bg-green-500 hover:bg-green-600 text-xs">Success</Badge>
              </CardTitle>
              <CardDescription className="text-muted-foreground text-sm sm:text-base">
                Your meme has been successfully registered on Story Protocol
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 text-green-400 bg-green-500/10 p-3 rounded-lg">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm sm:text-base">Registered on Story Protocol</span>
          </div>
          
          {/* Responsive asset details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Asset ID */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground font-medium text-sm">Asset ID</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(ipAssetId, 'assetId')}
                >
                  {copiedField === 'assetId' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
              <div className="font-mono text-xs sm:text-sm p-3 bg-black/20 rounded-md border border-border/50 break-all">
                {/* Show truncated on mobile, full on larger screens */}
                <div className="block sm:hidden">{truncateAddress(ipAssetId)}</div>
                <div className="hidden sm:block">{ipAssetId}</div>
              </div>
            </div>
            
            {/* Transaction Hash */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-muted-foreground font-medium text-sm">Transaction</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(txHash, 'txHash')}
                >
                  {copiedField === 'txHash' ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
              <div className="font-mono text-xs sm:text-sm p-3 bg-black/20 rounded-md border border-border/50 break-all">
                {/* Show truncated on mobile, full on larger screens */}
                <div className="block sm:hidden">{truncateAddress(txHash)}</div>
                <div className="hidden sm:block">{txHash}</div>
              </div>
            </div>
          </div>

          {/* Responsive action buttons - Stack on mobile, row on larger screens */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => window.open(`https://testnet.storyprotocol.xyz/ipa/${ipAssetId}`, '_blank')}
              className="gap-2 flex-1 justify-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">View on Story</span>
              <span className="sm:hidden">Story Protocol</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank')}
              className="gap-2 flex-1 justify-center"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">View on Etherscan</span>
              <span className="sm:hidden">Etherscan</span>
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
            <XCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm sm:text-base">Registration Failed</span>
          </div>
          {/* Truncate long error messages on mobile */}
          <p className="text-sm text-muted-foreground mt-2 break-words bg-red-500/10 p-3 rounded-md">
            {error.length > 200 && window.innerWidth < 640 ? 
              `${error.substring(0, 200)}...` : error}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              onClick={handleRegister}
              disabled={isRegistering}
              className="gap-2 flex-1 justify-center"
              variant="outline"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Try Again</span>
              <span className="sm:hidden">Retry</span>
            </Button>
            <Button
              onClick={handleRefreshProject}
              variant="outline"
              size="sm"
              className="flex-1 justify-center"
            >
              <span className="hidden sm:inline">Refresh Project</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/50 backdrop-blur-sm border-border/50 w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl sm:text-2xl font-bold text-foreground flex flex-wrap items-center gap-2">
          Register IP Asset
          <Badge variant="secondary" className="text-xs hidden sm:inline">On-Chain</Badge>
        </CardTitle>
        <CardDescription className="text-muted-foreground text-sm sm:text-base">
          Register your meme creation as an IP asset on Story Protocol to protect your work
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-medium text-sm sm:text-base">Story Protocol Registration</span>
          <Badge variant="secondary" className="text-xs sm:hidden">On-Chain</Badge>
        </div>

        {/* Responsive feature list - 2 columns on larger screens, 1 column on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
          <p className="break-words">• Register your meme as a unique IP asset</p>
          <p className="break-words">• Set royalties for future usage</p>
          <p className="break-words">• Protect your creative work on-chain</p>
          <p className="break-words">• License your content to others</p>
        </div>

        {/* Debug Info - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <div className="font-semibold text-yellow-800">Debug Info:</div>
            <div className="break-all truncate">Project ID: {project.id}</div>
            <div className="break-all truncate">Output URI: {project.outputUri || 'Not set'}</div>
            <div>Status: {project.status}</div>
          </div>
        )}

        <Button
          onClick={handleRegister}
          disabled={isRegistering || !canRegister}
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
              <span className="hidden sm:inline">Refresh Project Status</span>
              <span className="sm:hidden">Refresh Status</span>
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