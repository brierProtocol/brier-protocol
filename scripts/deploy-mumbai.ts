import { ethers } from 'ethers'
import * as fs   from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Required env vars
// ---------------------------------------------------------------------------

const REQUIRED_ENV = [
  'MUMBAI_RPC_URL',
  'DEPLOYER_PRIVATE_KEY',
  'USDC_ADDRESS_MUMBAI',
  'GNOSIS_SAFE_ADDRESS',
  'BRIER_FEE_RECIPIENT',
  'DAEMON_WALLET_ADDRESS',
] as const

function validateEnv() {
  const missing: string[] = []
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) missing.push(key)
  }
  if (missing.length > 0) {
    console.error('\n❌ Missing required environment variables:')
    missing.forEach((k) => console.error(`   - ${k}`))
    console.error('\nAdd them to .env.local and try again.\n')
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n═══════════════════════════════════════════')
  console.log('  BRIER PROTOCOL — Mumbai Testnet Deploy')
  console.log('═══════════════════════════════════════════\n')

  validateEnv()

  const provider = new ethers.JsonRpcProvider(process.env.MUMBAI_RPC_URL)
  const deployer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider)

  // Network check
  const network = await provider.getNetwork()
  if (network.chainId !== 80001n) {
    console.error(`❌ Wrong network. Expected Mumbai (80001), got ${network.chainId}`)
    process.exit(1)
  }

  console.log(`Deployer : ${deployer.address}`)
  console.log(`Network  : Mumbai Testnet (chainId 80001)`)

  const balance = await provider.getBalance(deployer.address)
  console.log(`Balance  : ${ethers.formatEther(balance)} MATIC`)

  if (balance < ethers.parseEther('0.01')) {
    console.error('\n❌ Insufficient MATIC. Get testnet MATIC from:')
    console.error('   https://faucet.polygon.technology/\n')
    process.exit(1)
  }

  // Load compiled contract artifact
  const artifactPath = path.join(
    __dirname,
    '../artifacts/contracts/BrierVault.sol/BrierVault.json'
  )

  if (!fs.existsSync(artifactPath)) {
    console.error('\n❌ Contract artifact not found. Run `npx hardhat compile` first.\n')
    process.exit(1)
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
  const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer)

  // Constructor arguments
  const constructorArgs: [string, string, string, string, string, string, string] = [
    process.env.USDC_ADDRESS_MUMBAI!,   // asset (USDC on Mumbai)
    'Brier Vault: Genesis Bot',          // name
    'bvGENESIS',                         // symbol
    process.env.DAEMON_WALLET_ADDRESS!,  // brierDaemon
    deployer.address,                    // builderWallet (deployer acts as test bot owner)
    process.env.GNOSIS_SAFE_ADDRESS!,    // gnosisSafeAdmin
    process.env.BRIER_FEE_RECIPIENT!,   // feeRecipient
  ]

  console.log('\nConstructor args:')
  const labels = ['asset', 'name', 'symbol', 'daemon', 'builder', 'safe', 'feeRecipient']
  constructorArgs.forEach((v, i) => console.log(`  ${labels[i].padEnd(14)}: ${v}`))

  console.log('\nDeploying BrierVault...')

  const vault = await factory.deploy(...constructorArgs)
  const deployTx = vault.deploymentTransaction()

  console.log(`Tx hash  : ${deployTx?.hash}`)
  console.log('Waiting for confirmation...')

  await vault.waitForDeployment()

  const address = await vault.getAddress()
  const receipt = await deployTx?.wait(2)

  console.log('\n✅ BrierVault deployed!')
  console.log(`Address  : ${address}`)
  console.log(`Block    : ${receipt?.blockNumber}`)
  console.log(`Gas used : ${receipt?.gasUsed?.toString()}`)
  console.log(`Explorer : https://mumbai.polygonscan.com/address/${address}`)

  // ---------------------------------------------------------------------------
  // Save deployment info
  // ---------------------------------------------------------------------------

  const deploymentDir = path.join(__dirname, '../deployments')
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true })
  }

  const deployment = {
    network:     'mumbai',
    chainId:     80001,
    address,
    deployer:    deployer.address,
    deployedAt:  new Date().toISOString(),
    txHash:      deployTx?.hash,
    blockNumber: receipt?.blockNumber,
    args: {
      asset:         constructorArgs[0],
      name:          constructorArgs[1],
      symbol:        constructorArgs[2],
      brierDaemon:   constructorArgs[3],
      builderWallet: constructorArgs[4],
      gnosisSafe:    constructorArgs[5],
      feeRecipient:  constructorArgs[6],
    },
  }

  const outPath = path.join(deploymentDir, 'mumbai.json')
  fs.writeFileSync(outPath, JSON.stringify(deployment, null, 2))

  console.log(`\nDeployment saved → ${outPath}`)

  // ---------------------------------------------------------------------------
  // Next steps
  // ---------------------------------------------------------------------------

  console.log('\n═══════════════════════════════════════════')
  console.log('  NEXT STEPS')
  console.log('═══════════════════════════════════════════')
  console.log('1. Add VAULT_ADDRESS_MUMBAI=' + address + ' to .env.local')
  console.log('2. Update the Bot row in your DB:')
  console.log('   prisma studio → Bot → vaultAddress = ' + address)
  console.log('3. Start the daemon:')
  console.log('   DAEMON_PRIVATE_KEY=... node src/indexer/shadow_daemon.js')
  console.log('4. Watch for 48h of continuous operation')
  console.log('5. If stable → create Gnosis Safe at safe.global with 3 wallets')
  console.log('═══════════════════════════════════════════\n')
}

main().catch((err) => {
  console.error('\n❌ Deploy failed:', err.message ?? err)
  process.exit(1)
})
