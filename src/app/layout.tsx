import type { Metadata } from 'next'
import './globals.css'
import Web3Provider from '@/providers/Web3Provider'
import { Toaster } from '@/components/ui/toaster'
import dynamic from 'next/dynamic'

// Dynamically import NetworkSwitch with no SSR
const NetworkSwitch = dynamic(
  () => import('@/components/NetworkSwitch').then((mod) => mod.NetworkSwitch),
  { 
    ssr: false,
    loading: () => null
  }
)

export const metadata: Metadata = {
  title: 'MemeSync - Sync Memes with AI Audio',
  description: 'Create and sync memes with AI-generated audio, then register on Story Protocol',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <Web3Provider>
          {children}
          <NetworkSwitch />
          <Toaster />
        </Web3Provider>
      </body>
    </html>
  )
}