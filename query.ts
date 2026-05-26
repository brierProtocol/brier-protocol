import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const bots = await prisma.bot.findMany();
  console.log('Bots in DB:', bots.map(b => b.id));

  // try adding a comment
  try {
    await prisma.comment.create({
      data: {
        botId: 'adan-pred',
        wallet: '0x123',
        text: 'hello'
      }
    })
    console.log('Comment created!')
  } catch (err) {
    console.error('Comment creation failed:', err)
  }
}
main().finally(() => prisma.$disconnect())
