import { createConfig, http } from 'wagmi'
import { polygonAmoy } from 'wagmi/chains'
import { injected, walletConnect } from '@wagmi/connectors'

export const wagmiConfig = createConfig({
  chains: [polygonAmoy],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '1234567890abcdef1234567890abcdef',
    }),
  ],
  transports: {
    [polygonAmoy.id]: http(
      process.env.NEXT_PUBLIC_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology'
    ),
  },
})
