'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';

interface UseWalletAuthReturn {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: (connectorId: string) => void;
  disconnect: () => void;
  signIn: () => Promise<string | null>;
  isSigning: boolean;
}

export function useWalletAuth(): UseWalletAuthReturn {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isLoading: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const [isSigning, setIsSigning] = useState(false);

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      connect({ connector });
    }
  };

  const signIn = async (): Promise<string | null> => {
    if (!address) return null;

    try {
      setIsSigning(true);
      
      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: 'Sign in with Ethereum to MemeSync',
        uri: window.location.origin,
        version: '1',
        chainId: 1315,
        nonce: Math.random().toString(36).substring(2),
      });

      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      // Verify signature with backend
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.prepareMessage(),
          signature,
          address,
        }),
      });

      if (response.ok) {
        const { token } = await response.json();
        localStorage.setItem('memesync-auth-token', token);
        return token;
      }

      return null;
    } catch (error) {
      console.error('Sign-in failed:', error);
      return null;
    } finally {
      setIsSigning(false);
    }
  };

  return {
    address: address || null,
    isConnected,
    isConnecting,
    connect: handleConnect,
    disconnect,
    signIn,
    isSigning,
  };
}