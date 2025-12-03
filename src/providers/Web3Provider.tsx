'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { WagmiProvider, Config } from 'wagmi'; 
import { createWagmiConfig } from '@/lib/web3-config';

export default function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [config, setConfig] = useState<Config | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only create config on client side after mounting
    if (typeof window !== 'undefined') {
      try {
        const wagmiConfig = createWagmiConfig();
        setConfig(wagmiConfig);
      } catch (error) {
        console.error('Failed to create Wagmi config:', error);
      }
      setMounted(true);
    }
  }, []);

  // Don't render anything until mounted on client
  if (!mounted) {
    return <>{children}</>;
  }

  // If config failed to load, render children without Web3
  if (!config) {
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}