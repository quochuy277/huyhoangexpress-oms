/*
  Warnings:

  - The values [SUBMITTED,IN_REVIEW,APPROVED,REJECTED,COMPENSATED] on the enum `ClaimStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `claimAmount` on the `ClaimOrder` table. All the data in the column will be lost.
  - You are about to drop the column `claimType` on the `ClaimOrder` table. All the data in the column will be lost.
  - You are about to drop the column `compensationAmount` on the `ClaimOrder` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `ClaimOrder` table. All the data in the column will be lost.
  - You are about to drop the column `resolvedDate` on the `ClaimOrder` table. All the data in the column will be lost.
  - You are about to drop the column `submittedDate` on the `ClaimOrder` table. All the data in the column will be lost.
  - Added the required column `issueType` to the `ClaimOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('SLOW_JOURNEY', 'SUSPICIOUS', 'LOST', 'DAMAGED', 'OTHER');

-- CreateEnum
CREATE TYPE "ClaimSource" AS ENUM ('AUTO_SLOW_JOURNEY', 'AUTO_INTERNAL_NOTE', 'FROM_DELAYED', 'FROM_RETURNS', 'FROM_ORDERS', 'MANUAL');

-- AlterEnum
BEGIN;
CREATE TYPE "ClaimStatus_new" AS ENUM ('PENDING', 'VERIFYING_CARRIER', 'CLAIM_SUBMITTED', 'COMPENSATION_REQUESTED', 'RESOLVED', 'CARRIER_COMPENSATED', 'CARRIER_REJECTED', 'CUSTOMER_COMPENSATED', 'CUSTOMER_REJECTED');
ALTER TABLE "ClaimOrder" ALTER COLUMN "claimStatus" DROP DEFAULT;
ALTER TABLE "ClaimOrder" ALTER COLUMN "claimStatus" TYPE "ClaimStatus_new" USING ("claimStatus"::text::"ClaimStatus_new");
ALTER TYPE "ClaimStatus" RENAME TO "ClaimStatus_old";
ALTER TYPE "ClaimStatus_new" RENAME TO "ClaimStatus";
DROP TYPE "ClaimStatus_old";
ALTER TABLE "ClaimOrder" ALTER COLUMN "claimStatus" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "ClaimOrder" DROP COLUMN "claimAmount",
DROP COLUMN "claimType",
DROP COLUMN "compensationAmount",
DROP COLUMN "notes",
DROP COLUMN "resolvedDate",
DROP COLUMN "submittedDate",
ADD COLUMN     "carrierCompensation" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "completedBy" TEXT,
ADD COLUMN     "customerCompensation" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "detectedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "issueType" "IssueType" NOT NULL,
ADD COLUMN     "processingContent" TEXT,
ADD COLUMN     "source" "ClaimSource" NOT NULL DEFAULT 'MANUAL',
ALTER COLUMN "issueDescription" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "claimLocked" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "ClaimType";

-- CreateTable
CREATE TABLE "ClaimStatusHistory" (
    "id" TEXT NOT NULL,
    "claimOrderId" TEXT NOT NULL,
    "fromStatus" "ClaimStatus",
    "toStatus" "ClaimStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "ClaimStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimChangeLog" (
    "id" TEXT NOT NULL,
    "claimOrderId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClaimStatusHistory_claimOrderId_idx" ON "ClaimStatusHistory"("claimOrderId");

-- CreateIndex
CREATE INDEX "ClaimChangeLog_claimOrderId_idx" ON "ClaimChangeLog"("claimOrderId");

-- CreateIndex
CREATE INDEX "ClaimChangeLog_changedAt_idx" ON "ClaimChangeLog"("changedAt");

-- CreateIndex
CREATE INDEX "ClaimOrder_issueType_idx" ON "ClaimOrder"("issueType");

-- CreateIndex
CREATE INDEX "ClaimOrder_isCompleted_idx" ON "ClaimOrder"("isCompleted");

-- CreateIndex
CREATE INDEX "Order_claimLocked_idx" ON "Order"("claimLocked");

-- AddForeignKey
ALTER TABLE "ClaimStatusHistory" ADD CONSTRAINT "ClaimStatusHistory_claimOrderId_fkey" FOREIGN KEY ("claimOrderId") REFERENCES "ClaimOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimChangeLog" ADD CONSTRAINT "ClaimChangeLog_claimOrderId_fkey" FOREIGN KEY ("claimOrderId") REFERENCES "ClaimOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
