import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const userWallets = ['0x247a6c6610eca35cbcb37c8562aca5afb331bff1', '0x247A6c6610eca35Cbcb37c8562aCa5Afb331BFf1']
  
  for (const wallet of userWallets) {
    await prisma.notification.create({
      data: {
        walletAddress: wallet,
        type: 'VAULT_OPENED',
        title: 'Vault Opened: ADAN',
        message: 'The shadow phase is complete. ADAN has opened its vault for deposits.',
        metadata: JSON.stringify({
          botId: 'adan-pred',
          botSlug: 'adan-pred'
        })
      }
    })
  }

  console.log('Successfully seeded Vault Opened notifications!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
