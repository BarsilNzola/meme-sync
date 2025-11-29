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
import { useWalletAuth } from '@/hooks/useWalletAuth';
import { useToast } from '@/hooks/use-toast';
import { useConnect } from 'wagmi';

export default function WalletConnect() {
  const { address, isConnected, isConnecting, disconnect, signIn, isSigning } = useWalletAuth();
  const { connect, connectors } = useConnect();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleConnect = async (connectorId: string) => {
    try {
      const connector = connectors.find(c => c.id === connectorId);
      if (connector) {
        connect({ connector });
        // Auto-sign message after connection
        setTimeout(async () => {
          const token = await signIn();
          if (token) {
            toast({
              title: 'Successfully connected!',
              description: 'Your wallet is now connected to MemeSync.',
            });
          }
        }, 1000);
      }
    } catch (error) {
      toast({
        title: 'Connection failed',
        description: 'Please try connecting again.',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    localStorage.removeItem('memesync-auth-token');
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

  if (!isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Choose Wallet</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleConnect('injected')}>
            MetaMask
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleConnect('coinbaseWallet')}>
            Coinbase Wallet
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleConnect('walletConnect')}>
            WalletConnect
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
          {isSigning && (
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyAddress} className="flex items-center justify-between">
          <span className="text-sm">{formatAddress(address!)}</span>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDisconnect} className="text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}