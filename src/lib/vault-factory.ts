import { ethers } from 'ethers'

// Minimal ABI for the on-chain factory.
const FACTORY_ABI = [
  'function deployVault(string botId, address asset, string vaultName, string vaultSymbol, address brierDaemon, address builderWallet, address polymarketCTF, address gnosisSafeAdmin, address feeRecipient, uint256 maxCapacity, uint256 skinInGameAmount) external returns (address)',
  'event VaultDeployed(string botId, address vaultAddress)',
]

// Polygon mainnet defaults (overridable via env for Amoy/test).
const USDC = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'
const CTF_EXCHANGE = process.env.POLYMARKET_CTF_EXCHANGE || '0x4bFB41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E'

type BotForVault = {
  id: string
  slug?: string | null
  name: string
  walletAddress: string
  vaultCap?: number | null
}

/**
 * Deploys a per-bot clone vault via BrierVaultFactory and returns its address.
 *
 * Gated on configuration: requires VAULT_FACTORY_ADDRESS + a funded
 * DEPLOYER/EXECUTOR key. If not configured, returns null so the caller can still
 * promote the bot and wire the vault later (e.g. on testnet before mainnet keys).
 */
export async function createVaultForBot(bot: BotForVault): Promise<string | null> {
  const factoryAddress = process.env.VAULT_FACTORY_ADDRESS || process.env.NEXT_PUBLIC_VAULT_FACTORY_ADDRESS
  const pk = process.env.DEPLOYER_PRIVATE_KEY || process.env.EXECUTOR_PRIVATE_KEY
  const rpc = process.env.DEPLOY_RPC_URL || process.env.NEXT_PUBLIC_DEPOSIT_RPC_URL

  if (!factoryAddress || !pk || !rpc) {
    console.warn('[vault-factory] not configured (VAULT_FACTORY_ADDRESS / key / RPC) — skipping on-chain deploy')
    return null
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpc)
    const signer = new ethers.Wallet(pk, provider)
    const factory = new ethers.Contract(factoryAddress, FACTORY_ABI, signer)

    const admin = process.env.GNOSIS_SAFE_ADMIN || signer.address
    const daemon = process.env.EXECUTOR_ADDRESS || signer.address
    const feeRecipient = process.env.FEE_RECIPIENT_ADDRESS || signer.address
    const cap = ethers.parseUnits(String(bot.vaultCap ?? 50000), 6)

    const tx = await factory.deployVault(
      bot.id,
      USDC,
      `Brier ${bot.name}`,
      `bv${(bot.slug || bot.id).slice(0, 6).toUpperCase()}`,
      daemon,
      bot.walletAddress,
      CTF_EXCHANGE,
      admin,
      feeRecipient,
      cap,
      0n, // skin-in-the-game funded separately by the builder
    )
    const receipt = await tx.wait()

    // Parse the VaultDeployed event for the clone address.
    const iface = new ethers.Interface(FACTORY_ABI)
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log)
        if (parsed?.name === 'VaultDeployed') return parsed.args.vaultAddress as string
      } catch { /* not our event */ }
    }
    return null
  } catch (err: any) {
    console.error('[vault-factory] deploy failed:', err?.message || err)
    return null
  }
}
