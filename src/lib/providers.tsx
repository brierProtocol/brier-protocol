'use client'

import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { polygon, hardhat } from 'wagmi/chains'
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit'
import { ReactNode, useState } from 'react'

import { metaMaskWallet, coinbaseWallet, walletConnectWallet, injectedWallet } from '@rainbow-me/rainbowkit/wallets'

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'brier_protocol_demo'

const config = getDefaultConfig({
  appName: 'Brier Protocol',
  projectId: projectId,
  chains: [hardhat, polygon],
  ssr: false,
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [injectedWallet, metaMaskWallet, coinbaseWallet, walletConnectWallet],
    },
  ],
})

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#2563EB',
            accentColorForeground: 'white',
            borderRadius: 'small',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
