import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing old data...')
  await prisma.$executeRawUnsafe(`DELETE FROM "ClaimOrder";`)
  await prisma.$executeRawUnsafe(`DELETE FROM "ReturnTracking";`)
  await prisma.$executeRawUnsafe(`DELETE FROM "UploadHistory";`)
  await prisma.$executeRawUnsafe(`DELETE FROM "Order";`)
  console.log('Data cleared successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
