-- AlterTable
ALTER TABLE "TodoItem" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClaimChangeLog_changedBy_changedAt_idx" ON "ClaimChangeLog"("changedBy", "changedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClaimOrder_isCompleted_deadline_idx" ON "ClaimOrder"("isCompleted", "deadline");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClaimOrder_isCompleted_detectedDate_idx" ON "ClaimOrder"("isCompleted", "detectedDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClaimOrder_claimStatus_detectedDate_idx" ON "ClaimOrder"("claimStatus", "detectedDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClaimOrder_issueType_isCompleted_idx" ON "ClaimOrder"("issueType", "isCompleted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClaimStatusHistory_changedBy_changedAt_idx" ON "ClaimStatusHistory"("changedBy", "changedAt");

-- CreateIndex
CREATE INDEX "Order_carrierOrderCode_idx" ON "Order"("carrierOrderCode");

-- CreateIndex
CREATE INDEX "Order_receiverPhone_idx" ON "Order"("receiverPhone");

-- CreateIndex
CREATE INDEX "Order_regionGroup_idx" ON "Order"("regionGroup");

-- CreateIndex
CREATE INDEX "Order_partialOrderType_idx" ON "Order"("partialOrderType");

-- CreateIndex
CREATE INDEX "Order_carrierName_createdTime_idx" ON "Order"("carrierName", "createdTime");

-- CreateIndex
CREATE INDEX "Order_salesStaff_createdTime_idx" ON "Order"("salesStaff", "createdTime");

-- CreateIndex
CREATE INDEX "Order_shopName_createdTime_idx" ON "Order"("shopName", "createdTime");

-- CreateIndex
CREATE INDEX "Order_claimLocked_deliveryStatus_lastUpdated_idx" ON "Order"("claimLocked", "deliveryStatus", "lastUpdated");

-- CreateIndex
CREATE INDEX "Order_claimLocked_deliveryStatus_partialOrderType_warehouse_idx" ON "Order"("claimLocked", "deliveryStatus", "partialOrderType", "warehouseArrivalDate");

-- CreateIndex
CREATE INDEX "Order_createdTime_revenue_idx" ON "Order"("createdTime", "revenue");

-- CreateIndex
CREATE INDEX "TodoItem_assigneeId_status_dueDate_idx" ON "TodoItem"("assigneeId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "TodoItem_assigneeId_sortOrder_idx" ON "TodoItem"("assigneeId", "sortOrder");

-- CreateIndex
CREATE INDEX "TodoItem_createdById_idx" ON "TodoItem"("createdById");
