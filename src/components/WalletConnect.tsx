'use client';

import { useState } from 'react';
import { LogOut, Wallet, User, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function WalletConnect() {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors, isLoading: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleConnect = async (connectorId: string) => {
    try {
      const connector = connectors.find(c => c.id === connectorId);
      if (connector) {
        await connect({ connector });
        toast({
          title: 'Wallet Connected!',
          description: 'Your wallet is now connected to MemeSync.',
        });
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      toast({
        title: 'Connection failed',
        description: error?.message || 'Please try connecting again.',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: 'Disconnected',
      description: 'Your wallet has been disconnected.',
    });
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast({
        title: 'Address copied!',
        description: 'Wallet address copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Show network badge if connected
  const getNetworkBadge = () => {
    if (!connector) return null;
    
    // Get connector name and handle string/string[] properly
    const connectorName = connector.name;
    const name = Array.isArray(connectorName) ? connectorName[0] : connectorName;
    const lowerName = (name || '').toLowerCase();
    
    if (lowerName.includes('metamask')) return '🦊';
    if (lowerName.includes('coinbase')) return '💰';
    if (lowerName.includes('walletconnect')) return '🔗';
    if (lowerName.includes('trust')) return '🔒';
    if (lowerName.includes('phantom')) return '👻';
    return '🔷';
  };

  if (!isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2" disabled={isConnecting}>
            <Wallet className="w-4 h-4" />
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Choose Wallet</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => handleConnect('injected')} 
            disabled={isConnecting}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>🦊</span>
              <span>MetaMask / Injected</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleConnect('coinbaseWallet')} 
            disabled={isConnecting}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>💰</span>
              <span>Coinbase Wallet</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleConnect('walletConnect')} 
            disabled={isConnecting}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>🔗</span>
              <span>WalletConnect</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <User className="w-4 h-4" />
          {address ? formatAddress(address) : 'Connected'}
          <span className="ml-1">{getNetworkBadge()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="text-xs text-gray-500">Connected with</div>
          <div className="flex items-center gap-2">
            <span>{getNetworkBadge()}</span>
            <span>{connector?.name || 'Wallet'}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={copyAddress} 
          className="flex items-center justify-between cursor-pointer"
        >
          <span className="text-sm font-mono">{formatAddress(address!)}</span>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleDisconnect} 
          className="text-red-600 cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}