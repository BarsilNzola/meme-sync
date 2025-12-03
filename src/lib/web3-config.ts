import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { walletConnect } from 'wagmi/connectors'
import { coinbaseWallet } from 'wagmi/connectors'

export const aeneid = {
  id: 1315,
  name: 'Story Aeneid',
  network: 'aeneid',
  nativeCurrency: {
    decimals: 18,
    name: 'IP Token',
    symbol: 'IP',
  },
  rpcUrls: {
    default: {
      http: ['https://aeneid.storyrpc.io'],
    },
    public: {
      http: ['https://aeneid.storyrpc.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Aeneid Explorer',
      url: 'https://aeneid-explorer.storyprotocol.xyz',
    },
  },
  testnet: true,
} as const

export function createWagmiConfig() {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-key';
  
  const transports = {
    [aeneid.id]: http('https://aeneid.storyrpc.io'),
    [sepolia.id]: http(), 
    [mainnet.id]: http(),  
  }

  // Create connectors
  const connectors = [
    injected({ shimDisconnect: true }), 
    walletConnect({
      projectId,
      showQrModal: true,
    }),
    coinbaseWallet({
      appName: 'MemeSync',
      appLogoUrl: 'https://memesync.vercel.app/logo.png',
    }),
  ];

  console.log('Creating wagmi config with connectors:', connectors.map(c => c.name));

  return createConfig({
    transports,
    chains: [aeneid, sepolia, mainnet],
    connectors,
    ssr: false, // Important: disable SSR
  });
}