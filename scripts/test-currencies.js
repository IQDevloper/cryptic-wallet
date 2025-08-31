const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Testing currency queries...')

  // Test the query used in merchant creation
  const activeCurrencies = await prisma.currency.findMany({
    where: { isActive: true },
    include: { 
      network: true,
      baseCurrency: true 
    }
  })

  console.log(`Found ${activeCurrencies.length} active currencies:`)
  activeCurrencies.forEach(currency => {
    console.log(`  - ${currency.baseCurrency.code} on ${currency.network.name} (${currency.tokenStandard || 'Native'})`)
  })

  // Test grouped currencies query
  const baseCurrencies = await prisma.baseCurrency.findMany({
    where: { 
      isActive: true,
      currencies: {
        some: {
          isActive: true,
        },
      },
    },
    include: {
      currencies: {
        where: { isActive: true },
        include: {
          network: true,
        },
      },
    },
    orderBy: { priority: 'asc' },
  })

  console.log(`\nFound ${baseCurrencies.length} base currencies with networks:`)
  baseCurrencies.forEach(baseCurrency => {
    console.log(`  ${baseCurrency.code} (${baseCurrency.name}):`)
    baseCurrency.currencies.forEach(currency => {
      console.log(`    - ${currency.network.name} (${currency.tokenStandard || 'Native'}, Fee: ${currency.withdrawFee})`)
    })
  })
}

main()
  .catch((e) => {
    console.error('❌ Error testing currencies:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })