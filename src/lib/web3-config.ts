import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { walletConnect } from 'wagmi/connectors'
import { coinbaseWallet } from 'wagmi/connectors'

const aeneid = {
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

// Define transports for each chain using the http utility from wagmi
const transports = {
  [aeneid.id]: http('https://aeneid.storyrpc.io'),
  [sepolia.id]: http(), 
  [mainnet.id]: http(),  
}

// Create Wagmi v2 config
export const config = createConfig({
  // Use http for all transports
  transports,
  // Define chains
  chains: [aeneid, sepolia, mainnet],
  // Define connectors
  connectors: [
    // Injected Connector (MetaMask, etc.)
    injected({ shimDisconnect: true }), 
    
    // WalletConnect Connector
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-key',
      showQrModal: true,
    }),
    
    // Coinbase Wallet Connector
    coinbaseWallet({
      appName: 'MemeSync',
    }),
  ],
})

export { aeneid }