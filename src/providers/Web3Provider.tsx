'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { useState, useEffect } from 'react';
import { createWagmiConfig } from '@/lib/web3-config';

console.log('Web3Provider is loading...');

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function Web3Provider({ children }: { children: React.ReactNode }) {
  console.log('Web3Provider rendering...');
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    try {
      // Create config on client side only
      const wagmiConfig = createWagmiConfig();
      setConfig(wagmiConfig);
      console.log('Wagmi config created successfully');
    } catch (error) {
      console.error('Failed to create wagmi config:', error);
    }
  }, []);

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  // If config failed to load, create a minimal fallback
  const finalConfig = config || {
    chains: [],
    transports: {},
    connectors: [],
  };

  return (
    <WagmiProvider config={finalConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}