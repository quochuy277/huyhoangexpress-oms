// Quick DB check script
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Check if OrderChangeLog table exists and has records
  try {
    const count = await prisma.orderChangeLog.count();
    console.log('[1] OrderChangeLog records:', count);
  } catch (e) {
    console.log('[1] ERROR accessing OrderChangeLog:', e.message);
  }

  // 2. Check UploadHistory totalChanges
  try {
    const uploads = await prisma.uploadHistory.findMany({
      orderBy: { uploadedAt: 'desc' },
      take: 5,
      select: { id: true, fileName: true, uploadedAt: true, totalChanges: true, newOrders: true, updatedOrders: true }
    });
    console.log('[2] Recent uploads:');
    uploads.forEach((u, i) => {
      console.log('  ' + (i+1) + '. ' + u.uploadedAt.toISOString() + ' | ' + u.fileName + ' | new=' + u.newOrders + ' updated=' + u.updatedOrders + ' changes=' + u.totalChanges);
    });
  } catch (e) {
    console.log('[2] ERROR accessing UploadHistory.totalChanges:', e.message);
  }

  // 3. Sample an order to check internalNotes format
  try {
    const sample = await prisma.order.findFirst({
      where: { internalNotes: { not: null } },
      select: { requestCode: true, deliveryStatus: true, internalNotes: true }
    });
    if (sample) {
      console.log('[3] Sample order ' + sample.requestCode + ':');
      console.log('  deliveryStatus: ' + sample.deliveryStatus);
      const notes = sample.internalNotes || '';
      console.log('  internalNotes (first 300 chars): ' + notes.substring(0, 300));
    } else {
      console.log('[3] No orders with internalNotes found');
    }
  } catch (e) {
    console.log('[3] ERROR:', e.message);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
