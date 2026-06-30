import { createConfig, http } from 'wagmi'
import { injected, walletConnect } from '@wagmi/connectors'
import { ACTIVE_CHAIN, DEPOSIT_RPC_URL } from '@/constants/contracts'

// Network is env-driven (see ACTIVE_CHAIN / DEPOSIT_RPC_URL in constants/contracts):
// Amoy testnet by default, Polygon mainnet when NEXT_PUBLIC_CHAIN_ID=137.
export const wagmiConfig = createConfig({
  chains: [ACTIVE_CHAIN],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '1234567890abcdef1234567890abcdef',
    }),
  ],
  transports: {
    [ACTIVE_CHAIN.id]: http(DEPOSIT_RPC_URL),
  },
})
