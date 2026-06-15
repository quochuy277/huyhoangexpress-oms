-- Monthly finance KPI targets (net revenue / net profit) used by the
-- dashboard hub and P&L report to show progress vs target.
--
-- Additive only: creates the new FinanceTarget table. It does NOT touch any
-- existing table or data. Like 20260426000000_add_login_attempts, this file
-- is hand-written and scoped to the new table — pre-existing DB drift on the
-- rest of the schema (e.g. PermissionGroup) is unrelated and reconciled
-- separately, so `prisma migrate dev` (which would reset) is intentionally
-- avoided. Applied via `prisma db execute` + `prisma migrate resolve --applied`.

-- CreateTable
CREATE TABLE "FinanceTarget" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "metric" TEXT NOT NULL,
    "targetAmount" DECIMAL(65,30) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinanceTarget_month_metric_key" ON "FinanceTarget"("month", "metric");
