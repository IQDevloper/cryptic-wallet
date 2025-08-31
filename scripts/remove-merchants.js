const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeMerchants() {
  await prisma.merchant.deleteMany();
}

removeMerchants()
  .catch((e) => {
    console.error('❌ Error removing merchants:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
