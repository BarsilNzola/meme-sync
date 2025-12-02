'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { WagmiConfig } from 'wagmi'; 
import { createWagmiConfig } from '@/lib/web3-config';
import { Config } from 'wagmi';

export default function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    // Only create config on client side
    const wagmiConfig = createWagmiConfig();
    setConfig(wagmiConfig);
  }, []);

  // Don't render until config is ready
  if (!config) {
    return <>{children}</>;
  }

  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiConfig>
  );
}