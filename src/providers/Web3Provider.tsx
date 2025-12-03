'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

// Create a minimal default config that's always valid
const defaultConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

export default function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [config, setConfig] = useState<typeof defaultConfig | null>(null);

  useEffect(() => {
    // Create config only on client side
    if (typeof window !== 'undefined') {
      try {
        // Try to load your custom config
        const { createWagmiConfig } = require('@/lib/web3-config');
        const wagmiConfig = createWagmiConfig();
        setConfig(wagmiConfig);
      } catch (error) {
        console.error('Failed to create custom Wagmi config, using default:', error);
        // Use the default config
        setConfig(defaultConfig);
      }
    } else {
      // Server-side: use default config
      setConfig(defaultConfig);
    }
  }, []);

  // Don't render until config is ready
  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Initializing Web3...</p>
        </div>
      </div>
    );
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}