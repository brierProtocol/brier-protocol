'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useState, useEffect } from 'react'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connectors, connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const [rawAddress, setRawAddress] = useState<string | null>(null)

  // Listen to raw provider just in case Wagmi hydration fails
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const getAddr = async () => {
        try {
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' })
          if (accounts.length > 0) setRawAddress(accounts[0])
        } catch (e) {}
      }
      getAddr()
      ;(window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) setRawAddress(accounts[0])
        else setRawAddress(null)
      })
    }
  }, [])

  const displayAddress = (isConnected && address) ? address : rawAddress

  if (displayAddress) {
    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <a 
          href={`/maker/${displayAddress}`}
          style={{
            color: '#2563EB',
            fontFamily: 'inherit',
            fontSize: '11px',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
          title="View Maker Profile"
        >
          [ID: {displayAddress.substring(0, 6)}...{displayAddress.substring(displayAddress.length - 4)}]
        </a>
        <button 
          onClick={() => {
            disconnect()
            setRawAddress(null)
          }}
          style={{
            background: 'none',
            color: '#ef4444',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: '11px',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'none'
          }}
          title="Disconnect Wallet"
        >
          [X]
        </button>
      </div>
    )
  }

  const handleConnect = async () => {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        
        // Force the MetaMask popup via raw provider first
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
        if (accounts && accounts.length > 0) {
          setRawAddress(accounts[0]) // Instantly update UI!
        }
        
        // Try to sync Wagmi state silently
        try {
          const metaMaskConnector = connectors.find(c => c.name.toLowerCase().includes('metamask') || c.id === 'metaMask')
          if (metaMaskConnector) {
            connect({ connector: metaMaskConnector })
          } else if (connectors.length > 0) {
            connect({ connector: connectors[0] })
          }
        } catch (wagmiErr) {
          console.warn("Wagmi sync failed, but raw provider connected", wagmiErr)
        }
        
      } else {
        alert("CRITICAL ERROR: No Web3 Wallet detected!\n\nYou must install the MetaMask extension in your browser to connect to Brier.")
      }
    } catch (err: any) {
      alert("Connection failed: " + err.message)
      console.error("Connection failed", err)
    }
  }

  return (
    <button 
      onClick={handleConnect}
      style={{
        background: 'none',
        color: '#22c55e',
        border: 'none',
        fontFamily: 'inherit',
        fontSize: '11px',
        cursor: 'pointer',
        padding: 0,
        textDecoration: 'underline'
      }}
    >
      &gt; CONNECT_WALLET
    </button>
  )
}
