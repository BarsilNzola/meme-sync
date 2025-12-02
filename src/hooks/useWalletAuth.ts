'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

interface UseWalletAuthReturn {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: (connectorId: string) => void;
  disconnect: () => void;
}

export function useWalletAuth(): UseWalletAuthReturn {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isLoading: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (connector) {
      connect({ connector });
    }
  };

  return {
    address: address || null,
    isConnected,
    isConnecting,
    connect: handleConnect,
    disconnect,
  };
}