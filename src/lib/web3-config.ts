import { createConfig, configureChains } from 'wagmi'
import { mainnet, sepolia, polygon } from 'wagmi/chains'
import { publicProvider } from 'wagmi/providers/public'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet'

// Story Protocol Aeneid testnet
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

// Configure chains & providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [aeneid, sepolia, mainnet, polygon],
  [publicProvider()],
)

// Set up connectors
const connectors = [
  new InjectedConnector({
    chains,
    options: {
      shimDisconnect: true,
      name: (detectedName) => `Browser Wallet (${detectedName})`,
    },
  }),
  new WalletConnectConnector({
    chains,
    options: {
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-key',
      showQrModal: true,
      metadata: {
        name: 'MemeSync',
        description: 'Sync memes with AI-generated audio and register on Story Protocol',
        url: 'https://memesync.xyz',
        icons: ['https://memesync.xyz/icon.png'],
      },
    },
  }),
  new CoinbaseWalletConnector({
    chains,
    options: {
      appName: 'MemeSync',
    },
  }),
]

// Create Wagmi config
export const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
})

export { aeneid }