-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClaimStatusHistory_changedAt_idx" ON "ClaimStatusHistory"("changedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClaimChangeLog_fieldName_idx" ON "ClaimChangeLog"("fieldName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_revenue_idx" ON "Order"("revenue");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_creatorShopName_createdTime_idx" ON "Order"("creatorShopName", "createdTime");
