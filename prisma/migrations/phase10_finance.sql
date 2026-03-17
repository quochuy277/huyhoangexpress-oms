-- Phase 10: Finance — Migration Script
-- Creates CashbookEntry, CashbookUpload, ExpenseCategory, Expense, MonthlyBudget

-- 1. CashbookGroup enum
DO $$ BEGIN
  CREATE TYPE "CashbookGroup" AS ENUM ('COD', 'SHOP_PAYOUT', 'RECONCILIATION_FEE', 'TOP_UP', 'COMPENSATION', 'COOPERATION_FEE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. CashbookEntry table
CREATE TABLE IF NOT EXISTS "CashbookEntry" (
  "id"              TEXT NOT NULL,
  "transactionTime" TIMESTAMP(3) NOT NULL,
  "receiptCode"     TEXT NOT NULL,
  "groupType"       "CashbookGroup" NOT NULL,
  "content"         TEXT NOT NULL,
  "amount"          DOUBLE PRECISION NOT NULL,
  "balance"         DOUBLE PRECISION NOT NULL,
  "rawCod"          DOUBLE PRECISION,
  "shippingFee"     DOUBLE PRECISION,
  "shopName"        TEXT,
  "uploadedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedBy"      TEXT NOT NULL,
  CONSTRAINT "CashbookEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CashbookEntry_receiptCode_key" ON "CashbookEntry"("receiptCode");
CREATE INDEX IF NOT EXISTS "CashbookEntry_transactionTime_idx" ON "CashbookEntry"("transactionTime");
CREATE INDEX IF NOT EXISTS "CashbookEntry_groupType_idx" ON "CashbookEntry"("groupType");
CREATE INDEX IF NOT EXISTS "CashbookEntry_receiptCode_idx" ON "CashbookEntry"("receiptCode");

-- 3. CashbookUpload table
CREATE TABLE IF NOT EXISTS "CashbookUpload" (
  "id"            TEXT NOT NULL,
  "fileName"      TEXT NOT NULL,
  "rowCount"      INTEGER NOT NULL,
  "newRows"       INTEGER NOT NULL,
  "duplicateRows" INTEGER NOT NULL,
  "dateFrom"      TIMESTAMP(3),
  "dateTo"        TIMESTAMP(3),
  "uploadedBy"    TEXT NOT NULL,
  "uploadedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashbookUpload_pkey" PRIMARY KEY ("id")
);

-- 4. ExpenseCategory table
CREATE TABLE IF NOT EXISTS "ExpenseCategory" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "isSystem"  BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ExpenseCategory_name_key" ON "ExpenseCategory"("name");

-- 5. Expense table
CREATE TABLE IF NOT EXISTS "Expense" (
  "id"             TEXT NOT NULL,
  "categoryId"     TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "amount"         DOUBLE PRECISION NOT NULL,
  "date"           DATE NOT NULL,
  "note"           TEXT,
  "attachmentUrl"  TEXT,
  "attachmentName" TEXT,
  "createdBy"      TEXT NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date");

-- 6. MonthlyBudget table
CREATE TABLE IF NOT EXISTS "MonthlyBudget" (
  "id"           TEXT NOT NULL,
  "categoryId"   TEXT NOT NULL,
  "month"        DATE NOT NULL,
  "budgetAmount" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "MonthlyBudget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MonthlyBudget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyBudget_categoryId_month_key" ON "MonthlyBudget"("categoryId", "month");

-- 7. Seed default expense categories
INSERT INTO "ExpenseCategory" ("id", "name", "isSystem", "sortOrder", "createdAt")
VALUES
  (gen_random_uuid()::text, 'Lương nhân viên', true, 1, NOW()),
  (gen_random_uuid()::text, 'Thưởng', true, 2, NOW()),
  (gen_random_uuid()::text, 'Phí hợp tác NVC', true, 3, NOW()),
  (gen_random_uuid()::text, 'Văn phòng phẩm / Vật chất', true, 4, NOW()),
  (gen_random_uuid()::text, 'Chi phí đền bù KH (chênh lệch)', true, 5, NOW())
ON CONFLICT ("name") DO NOTHING;
