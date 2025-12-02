'use client';

import { useState } from 'react';
import { 
  useAccount, 
  useSwitchChain, 
  useChainId
} from 'wagmi';
import { Button } from '@/components/ui/button';
import { aeneid } from '@/lib/web3-config'; 
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export default function NetworkSwitch() {
  const { isConnected, chain } = useAccount();
  const currentChainId = useChainId();
  
  const { switchChain, isLoading } = useSwitchChain();
  const [showPrompt, setShowPrompt] = useState(false);

  // Use currentChainId for reliability
  const isWrongNetwork = currentChainId !== aeneid.id; 
  
  // Only show prompts if wallet is connected
  if (!isConnected) return null;
  
  // Auto-show prompt if wrong network
  if (isWrongNetwork && !showPrompt) {
    setShowPrompt(true);
  }

  const handleSwitchNetwork = async () => {
    try {
      switchChain?.({ chainId: aeneid.id }); 
      setShowPrompt(false);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  if (!isWrongNetwork) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700 rounded-lg">
        <CheckCircle className="w-4 h-4 text-green-400" />
        <span className="text-sm">Connected to Story Aeneid</span>
      </div>
    );
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gradient-to-br from-purple-900 to-blue-900 border border-purple-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl font-bold text-white">Network Switch Required</h3>
        </div>
        
        <div className="space-y-4 mb-6">
          <p className="text-gray-300">
            You need to switch to the <span className="font-semibold text-white">Story Protocol Aeneid Testnet</span> to register your meme.
          </p>
          
          <div className="bg-black/30 rounded-lg p-3 border border-gray-800">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Current Network:</span>
              <span className="font-medium text-yellow-400">
                {chain?.name || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-400">Required Network:</span>
              <span className="font-medium text-green-400">
                Story Aeneid (Chain ID: {aeneid.id})
              </span>
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            <p>Your registration will fail if you don't switch networks.</p>
            <p className="mt-1">You'll need IP tokens on the Aeneid network for gas fees.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button
            onClick={handleSwitchNetwork}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Switching...
              </>
            ) : (
              'Switch to Story Aeneid'
            )}
          </Button>
          
          <Button
            onClick={() => setShowPrompt(false)}
            variant="outline"
            className="flex-1 border-gray-700 hover:bg-gray-800"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}