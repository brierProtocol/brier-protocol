import { ethers } from 'ethers'

const VAULT_ABI = [
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

export type VaultNav = {
  totalAssets: number   // USDC under management (LP capital only)
  totalSupply: number   // shares outstanding
  sharePrice: number    // assets per share (NAV)
}

/**
 * Reads a vault's live NAV on-chain. Returns null if no vault / RPC configured or
 * the read fails — callers fall back to indexed/estimated values.
 */
export async function readVaultNav(vaultAddress?: string | null): Promise<VaultNav | null> {
  const rpc = process.env.NEXT_PUBLIC_DEPOSIT_RPC_URL || process.env.DEPLOY_RPC_URL
  if (!vaultAddress || !/^0x[0-9a-fA-F]{40}$/.test(vaultAddress) || !rpc) return null

  try {
    const provider = new ethers.JsonRpcProvider(rpc)
    const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider)

    const [assetsRaw, supplyRaw] = await Promise.all([
      vault.totalAssets(),
      vault.totalSupply(),
    ])

    const assets = Number(ethers.formatUnits(assetsRaw, 6))   // USDC = 6 decimals
    const supply = Number(ethers.formatUnits(supplyRaw, 18))  // ERC4626 shares = 18
    const sharePrice = supply > 0 ? assets / supply : 1

    return { totalAssets: assets, totalSupply: supply, sharePrice }
  } catch (err: any) {
    console.warn('[vault-reader] NAV read failed:', err?.message || err)
    return null
  }
}
