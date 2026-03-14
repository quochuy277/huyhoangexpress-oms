-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerConfirmAsked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "warehouseArrivalDate" TIMESTAMP(3);
