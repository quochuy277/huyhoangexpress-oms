-- Reconcile pre-existing schema drift on "PermissionGroup".
--
-- The live database ALREADY has these columns (they were added/removed
-- directly on the DB outside the migration history at some point). This file
-- records that change so the migration history matches reality and a fresh
-- rebuild (`prisma migrate deploy` from scratch) produces the correct schema.
--
-- On the existing production DB this migration is registered via
-- `prisma migrate resolve --applied` and is NOT executed (the columns already
-- exist / are already gone), so no data is touched. Do NOT run it manually
-- against the current DB — it would error on the already-applied changes.

ALTER TABLE "PermissionGroup" DROP COLUMN "canScoreEmployees";
ALTER TABLE "PermissionGroup" ADD COLUMN "canViewDashboard" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PermissionGroup" ADD COLUMN "canUseAdvancedFilters" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PermissionGroup" ADD COLUMN "canViewClaimsTools" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PermissionGroup" ADD COLUMN "canEditShopInfo" BOOLEAN NOT NULL DEFAULT true;
