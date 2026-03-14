-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "confirmedAskedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAskedBy" TEXT,
ADD COLUMN     "customerConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customerConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "customerConfirmedBy" TEXT;
