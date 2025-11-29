'use client';

import { useState } from 'react';
import { Shield, CheckCircle, XCircle, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccount, useWalletClient, useContractWrite, useWaitForTransaction } from 'wagmi';
import { SyncProject } from '@/types/Project';
import { useToast } from '@/hooks/use-toast';
import { registerIPAsset } from '@/lib/story-sdk';
import MemeSyncArtifact from '@/artifacts/contracts/MemeSync.sol/MemeSync.json';

interface IPRegistrationBadgeProps {
  project: SyncProject;
}

const memesyncABI = MemeSyncArtifact.abi;

export default function IPRegistrationBadge({ project }: IPRegistrationBadgeProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { toast } = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ipAssetId, setIpAssetId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [ipAssetHash, setIpAssetHash] = useState<string | null>(null);

  // Contract write for prepareIPAsset
  const { write: prepareIPAsset, data: prepareData, isLoading: isPreparing } = useContractWrite({
    address: process.env.NEXT_PUBLIC_MEMESYNC_CONTRACT_ADDRESS as `0x${string}`,
    abi: memesyncABI,
    functionName: 'prepareIPAsset',
    onSuccess: (data) => {
      toast({
        title: 'IP Asset Prepared',
        description: 'Your asset has been prepared on-chain.',
      });
    },
    onError: (error) => {
      setIsRegistering(false);
      setError(error.message);
      toast({
        title: 'Preparation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Wait for prepareIPAsset transaction
  const { isLoading: isPreparingConfirming } = useWaitForTransaction({
    hash: prepareData?.hash,
    onSuccess: async (data) => {
      try {
        // Extract IP Asset Hash from transaction logs
        const hash = extractIPAssetHash(data);
        if (hash) {
          setIpAssetHash(hash);
          // Now register with Story Protocol
          await registerWithStoryProtocol();
        }
      } catch (error) {
        setError('Failed to extract IP asset hash');
        setIsRegistering(false);
      }
    },
  });

  const handleRegister = async () => {
    if (!address || !walletClient) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to register IP assets.',
        variant: 'destructive',
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
        image: `ipfs://${project.memeId}`,
        audio: `ipfs://${project.audioId}`,
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

      // Upload metadata to IPFS
      toast({
        title: 'Uploading metadata...',
        description: 'Storing metadata on IPFS.',
      });

      const metadataUri = await uploadMetadataToIPFS(metadata);

      // Call our contract's prepareIPAsset function
      toast({
        title: 'Preparing IP Asset...',
        description: 'Creating IP asset hash on-chain.',
      });

      prepareIPAsset({
        args: [BigInt(project.id), metadataUri],
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
      toast({
        title: 'Registration Failed',
        description: 'Failed to prepare IP asset.',
        variant: 'destructive',
      });
      setIsRegistering(false);
    }
  };

  const registerWithStoryProtocol = async () => {
    try {
      if (!walletClient || !ipAssetHash) {
        throw new Error('Missing required data for Story Protocol registration');
      }

      toast({
        title: 'Registering with Story Protocol...',
        description: 'Finalizing IP asset registration.',
      });

      const registrationResult = await registerIPAsset({
        projectId: project.id.toString(),
        projectName: project.projectName,
        memeId: project.memeId.toString(),
        outputUri: project.outputUri,
        metadataUri: `ipfs://${ipAssetHash}`, // Use the hash from our contract
        walletClient,
      });

      setIpAssetId(registrationResult.ipAssetId);
      setTxHash(registrationResult.txHash);
      
      toast({
        title: 'IP Asset Registered!',
        description: 'Your meme has been successfully registered on Story Protocol.',
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Story Protocol registration failed');
      toast({
        title: 'Registration Failed',
        description: 'Failed to register with Story Protocol.',
        variant: 'destructive',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const uploadMetadataToIPFS = async (metadata: any): Promise<string> => {
    try {
      const response = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload to IPFS');
      }

      const result = await response.json();
      return result.ipfsUri;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error('Failed to upload metadata to IPFS');
    }
  };

  const extractIPAssetHash = (data: any): string | null => {
    // Implement logic to extract IPAssetHash from transaction logs
    // This would parse the IPAssetPrepared event
    try {
      // Placeholder - implement actual log parsing
      return `0x${Math.random().toString(16).substr(2)}`;
    } catch (error) {
      console.error('Error extracting IP asset hash:', error);
      return null;
    }
  };

  const isLoading = isRegistering || isPreparing || isPreparingConfirming;

  if (ipAssetId) {
    return (
      <Card className="bg-background/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">IP Asset Registered</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your meme has been successfully registered on Story Protocol
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Registered on Story Protocol</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Asset ID</div>
              <div className="font-mono text-sm">{ipAssetId}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Transaction</div>
              <div className="font-mono text-sm truncate">{txHash}</div>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://testnet.storyprotocol.xyz/ipa/${ipAssetId}`, '_blank')}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              View on Story Protocol
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank')}
              className="gap-2"
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
      <Card className="bg-background/50 backdrop-blur-sm border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-400">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Registration Failed</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <Button
            onClick={handleRegister}
            disabled={isLoading}
            className="mt-4 gap-2"
            variant="outline"
          >
            <Shield className="w-4 h-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground">Register IP Asset</CardTitle>
        <CardDescription className="text-muted-foreground">
          Register your meme creation as an IP asset on Story Protocol to protect your work
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-medium">Story Protocol Registration</span>
          <Badge variant="secondary">On-Chain</Badge>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Register your meme as a unique IP asset</p>
          <p>• Set royalties for future usage</p>
          <p>• Protect your creative work on-chain</p>
          <p>• License your content to others</p>
        </div>

        <Button
          onClick={handleRegister}
          disabled={isLoading || !project.outputUri}
          className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isPreparing ? 'Preparing...' : 'Registering...'}
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              Register on Story Protocol
            </>
          )}
        </Button>

        {!project.outputUri && (
          <p className="text-sm text-yellow-600">
            Project must be exported before IP registration
          </p>
        )}

        {isLoading && (
          <div className="text-xs text-muted-foreground">
            This may take a few moments. Please don't close this window.
          </div>
        )}
      </CardContent>
    </Card>
  );
}