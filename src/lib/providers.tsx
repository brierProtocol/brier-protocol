'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import { ReactNode, useState } from 'react'

const projectId = 'brier_protocol_demo' // Mock project ID for demo

const config = createConfig({
  chains: [polygon],
  ssr: true,
  connectors: [
    metaMask(),
    coinbaseWallet({ appName: 'Brier' }),
    walletConnect({ projectId }),
  ],
  transports: {
    [polygon.id]: http(),
  },
})

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
