-- AlterTable
ALTER TABLE "User" ADD COLUMN     "citizenId" TEXT,
ADD COLUMN     "currentAddress" TEXT,
ADD COLUMN     "dateOfBirth" DATE,
ADD COLUMN     "hometown" TEXT,
ADD COLUMN     "permanentAddress" TEXT,
ADD COLUMN     "permissionGroupId" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "socialLink" TEXT;

-- CreateTable
CREATE TABLE "PermissionGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "canViewOrders" BOOLEAN NOT NULL DEFAULT true,
    "canUploadExcel" BOOLEAN NOT NULL DEFAULT true,
    "canDeleteOrders" BOOLEAN NOT NULL DEFAULT false,
    "canEditStaffNotes" BOOLEAN NOT NULL DEFAULT true,
    "canViewRevenue" BOOLEAN NOT NULL DEFAULT false,
    "canViewCarrierFee" BOOLEAN NOT NULL DEFAULT false,
    "canViewFinancePage" BOOLEAN NOT NULL DEFAULT false,
    "canViewDashboardFinance" BOOLEAN NOT NULL DEFAULT false,
    "canViewDelayed" BOOLEAN NOT NULL DEFAULT true,
    "canViewReturns" BOOLEAN NOT NULL DEFAULT true,
    "canConfirmReturn" BOOLEAN NOT NULL DEFAULT false,
    "canViewClaims" BOOLEAN NOT NULL DEFAULT true,
    "canCreateClaim" BOOLEAN NOT NULL DEFAULT true,
    "canUpdateClaim" BOOLEAN NOT NULL DEFAULT false,
    "canViewAllTodos" BOOLEAN NOT NULL DEFAULT false,
    "canViewAllAttendance" BOOLEAN NOT NULL DEFAULT false,
    "canEditAttendance" BOOLEAN NOT NULL DEFAULT false,
    "canScoreEmployees" BOOLEAN NOT NULL DEFAULT false,
    "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "canManagePermissions" BOOLEAN NOT NULL DEFAULT false,
    "isSystemGroup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PermissionGroup_name_key" ON "PermissionGroup"("name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "PermissionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
