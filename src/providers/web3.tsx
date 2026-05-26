'use client'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { polygon, mainnet } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { metaMask, walletConnect } from 'wagmi/connectors'

const config = createConfig({
  chains: [polygon, mainnet],
  ssr: true, // Crucial for Next.js 14+ hydration
  connectors: [
    metaMask(),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID! || 'placeholder-id' }),
  ],
  transports: {
    [polygon.id]: http(),
    [mainnet.id]: http(),
  },
})

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
