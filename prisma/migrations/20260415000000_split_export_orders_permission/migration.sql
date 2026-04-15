-- Split canExportOrders into two separate permissions:
--   canExportOrdersCustomer (Xuất Excel cho khách hàng)
--   canExportOrdersInternal (Xuất Excel nội bộ)
-- Backfill both from the old column before dropping it so existing groups
-- don't lose their export capability.

ALTER TABLE "PermissionGroup" ADD COLUMN "canExportOrdersCustomer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PermissionGroup" ADD COLUMN "canExportOrdersInternal" BOOLEAN NOT NULL DEFAULT false;

UPDATE "PermissionGroup"
SET "canExportOrdersCustomer" = "canExportOrders",
    "canExportOrdersInternal" = "canExportOrders";

ALTER TABLE "PermissionGroup" DROP COLUMN "canExportOrders";
