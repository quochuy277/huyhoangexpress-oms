-- DropIndex
DROP INDEX "Order_carrierOrderCode_trgm_idx";

-- DropIndex
DROP INDEX "Order_receiverName_trgm_idx";

-- DropIndex
DROP INDEX "Order_receiverPhone_trgm_idx";

-- DropIndex
DROP INDEX "Order_shopName_trgm_idx";

-- CreateIndex
CREATE INDEX "Order_pickupTime_idx" ON "Order"("pickupTime");

-- CreateIndex
CREATE INDEX "Order_paymentConfirmDate_idx" ON "Order"("paymentConfirmDate");

-- CreateIndex
CREATE INDEX "Order_reconciliationDate_idx" ON "Order"("reconciliationDate");

-- CreateIndex
CREATE INDEX "Order_codAmount_idx" ON "Order"("codAmount");

-- CreateIndex
CREATE INDEX "Order_totalFee_idx" ON "Order"("totalFee");

-- CreateIndex
CREATE INDEX "Order_carrierFee_idx" ON "Order"("carrierFee");
