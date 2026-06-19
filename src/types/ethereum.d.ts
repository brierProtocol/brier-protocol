import type { Eip1193Provider } from 'ethers'

// Ambient typing for the injected EIP-1193 wallet provider (MetaMask, etc.).
// Replaces the scattered `(window as any).ethereum` casts with a real type.
declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      // Event args are provider-defined; `any[]` keeps handler signatures
      // (e.g. (accounts: string[]) => void) assignable.
      on: (event: string, handler: (...args: any[]) => void) => void
      removeListener: (event: string, handler: (...args: any[]) => void) => void
      selectedAddress?: string | null
      isMetaMask?: boolean
    }
  }
}

export {}
