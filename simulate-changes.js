// Simulate changes: modify a few orders' data so next upload will detect differences
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Modify 5 orders: change their deliveryStatus and/or strip last line from internalNotes
  const orders = await prisma.order.findMany({
    where: { internalNotes: { not: null } },
    select: { requestCode: true, deliveryStatus: true, internalNotes: true },
    take: 5,
  });

  console.log(`Found ${orders.length} orders to modify for testing`);

  for (const order of orders) {
    const lines = order.internalNotes.split('\n');
    // Remove last 2 non-empty lines to simulate "old" data
    const trimmedLines = lines.slice(0, Math.max(1, lines.length - 2));
    const trimmedNotes = trimmedLines.join('\n');
    
    // Also flip deliveryStatus for one order
    const newStatus = order.deliveryStatus === 'DELIVERED' ? 'DELIVERING' : order.deliveryStatus;
    
    await prisma.order.update({
      where: { requestCode: order.requestCode },
      data: { 
        internalNotes: trimmedNotes,
        deliveryStatus: newStatus,
      },
    });
    
    console.log(`Modified ${order.requestCode}: removed ${lines.length - trimmedLines.length} lines, status ${order.deliveryStatus} -> ${newStatus}`);
  }

  console.log('\nDone! Upload the same file again to test change detection.');
  await prisma.$disconnect();
}

main().catch(console.error);
