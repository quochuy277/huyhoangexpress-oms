-- CreateEnum
CREATE TYPE "public"."CareResult" AS ENUM ('RESOLVED', 'IN_PROGRESS', 'WAITING', 'UNSATISFIED', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CashbookGroup" AS ENUM ('COD', 'SHOP_PAYOUT', 'RECONCILIATION_FEE', 'TOP_UP', 'COMPENSATION', 'COOPERATION_FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ContactMethod" AS ENUM ('PHONE_CALL', 'MESSAGE', 'EMAIL', 'IN_PERSON', 'SYSTEM', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."OrderChangeType" AS ENUM ('STATUS_CHANGE', 'WEIGHT_CHANGE', 'CARRIER_FEE_CONFIRMED', 'RECIPIENT_CHANGE', 'SURCHARGE_CHANGE', 'SERVICE_FEE_CHANGE', 'COD_CONFIRMED', 'RETURN_COMPLETED', 'CARRIER_SWITCH', 'REDELIVER', 'INTERNAL_STATUS_NOTE', 'RETURN_APPROVED', 'STAFF_NOTE', 'COD_AMOUNT_CHANGE', 'CLAIM_RELATED', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PipelineStage" AS ENUM ('DISCOVERED', 'CONTACTED', 'NEGOTIATING', 'TRIAL', 'CONVERTED');

-- CreateEnum
CREATE TYPE "public"."ProspectSize" AS ENUM ('SMALL', 'MEDIUM', 'LARGE');

-- CreateEnum
CREATE TYPE "public"."ProspectSource" AS ENUM ('FACEBOOK', 'SHOPEE', 'TIKTOK_SHOP', 'REFERRAL', 'DIRECT', 'LANDING_PAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ShopClass" AS ENUM ('VIP', 'NORMAL', 'NEW', 'WARNING', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."TodoSource" AS ENUM ('MANUAL', 'FROM_DELAYED', 'FROM_RETURNS', 'FROM_CLAIMS', 'FROM_ORDERS', 'FROM_CRM');

-- AlterEnum
ALTER TYPE "public"."AttendanceStatus" ADD VALUE 'UNAPPROVED_LEAVE';

-- AlterEnum
BEGIN;
CREATE TYPE "public"."TodoStatus_new" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
ALTER TABLE "public"."TodoItem" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."TodoItem" ALTER COLUMN "status" TYPE "public"."TodoStatus_new" USING ("status"::text::"public"."TodoStatus_new");
ALTER TYPE "public"."TodoStatus" RENAME TO "TodoStatus_old";
ALTER TYPE "public"."TodoStatus_new" RENAME TO "TodoStatus";
DROP TYPE "public"."TodoStatus_old";
ALTER TABLE "public"."TodoItem" ALTER COLUMN "status" SET DEFAULT 'TODO';
COMMIT;

-- DropIndex
DROP INDEX "public"."ClaimChangeLog_changedBy_changedAt_idx";

-- DropIndex
DROP INDEX "public"."ClaimOrder_claimStatus_detectedDate_idx";

-- DropIndex
DROP INDEX "public"."ClaimOrder_isCompleted_deadline_idx";

-- DropIndex
DROP INDEX "public"."ClaimOrder_isCompleted_detectedDate_idx";

-- DropIndex
DROP INDEX "public"."ClaimOrder_issueType_isCompleted_idx";

-- DropIndex
DROP INDEX "public"."ClaimStatusHistory_changedBy_changedAt_idx";

-- AlterTable
ALTER TABLE "public"."Attendance" DROP COLUMN "checkIn",
DROP COLUMN "checkOut",
DROP COLUMN "notes",
DROP COLUMN "totalHours",
ADD COLUMN     "editNote" TEXT,
ADD COLUMN     "editedBy" TEXT,
ADD COLUMN     "firstLogin" TIMESTAMP(3),
ADD COLUMN     "isLate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isManualEdit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLogout" TIMESTAMP(3),
ADD COLUMN     "lateMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalMinutes" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'ABSENT';

-- AlterTable
ALTER TABLE "public"."ClaimOrder" ALTER COLUMN "carrierCompensation" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "customerCompensation" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."LoginHistory" ADD COLUMN     "deviceType" TEXT,
ADD COLUMN     "lastHeartbeat" TIMESTAMP(3),
ADD COLUMN     "logoutReason" TEXT;

-- AlterTable
ALTER TABLE "public"."Order" ALTER COLUMN "codAmount" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "codOriginal" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "declaredValue" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "shippingFee" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "surcharge" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "overweightFee" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "insuranceFee" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "codServiceFee" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "returnFee" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "totalFee" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "carrierFee" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "ghsvInsuranceFee" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "revenue" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."PermissionGroup" ADD COLUMN     "canApproveLeave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canCreateAnnouncement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canDeleteClaim" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canExportOrders" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageBudgets" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageCRM" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageDocuments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageExpenses" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageLinks" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canUploadCashbook" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewAllShops" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewCRM" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "canViewCompensation" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."TodoItem" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "linkedOrderId" TEXT,
ADD COLUMN     "source" "public"."TodoSource" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "public"."UploadHistory" ADD COLUMN     "totalChanges" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnnouncementRead" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CashbookEntry" (
    "id" TEXT NOT NULL,
    "transactionTime" TIMESTAMP(3) NOT NULL,
    "receiptCode" TEXT NOT NULL,
    "groupType" "public"."CashbookGroup" NOT NULL,
    "content" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "balance" DECIMAL(65,30) NOT NULL,
    "rawCod" DECIMAL(65,30),
    "shippingFee" DECIMAL(65,30),
    "shopName" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "compositeKey" TEXT NOT NULL,

    CONSTRAINT "CashbookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CashbookUpload" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "newRows" INTEGER NOT NULL,
    "duplicateRows" INTEGER NOT NULL,
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashbookUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Expense" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readBy" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ImportantLink" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportantLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InfoChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT NOT NULL,
    "status" "public"."RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfoChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeaveRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "leaveStatus" "public"."LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MonthlyBudget" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "budgetAmount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "MonthlyBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderChangeLog" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "uploadHistoryId" TEXT NOT NULL,
    "changeType" "public"."OrderChangeType" NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "changeDetail" TEXT,
    "changeTimestamp" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProspectContactLog" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "contactMethod" "public"."ContactMethod" NOT NULL,
    "content" TEXT NOT NULL,
    "result" "public"."CareResult",
    "followUpDate" DATE,
    "authorName" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProspectContactLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopAssignment" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopCareLog" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "contactMethod" "public"."ContactMethod" NOT NULL,
    "content" TEXT NOT NULL,
    "result" "public"."CareResult",
    "relatedOrderId" TEXT,
    "followUpDate" DATE,
    "isAutoLog" BOOLEAN NOT NULL DEFAULT false,
    "authorName" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopCareLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopProfile" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "contactPerson" TEXT,
    "zalo" TEXT,
    "address" TEXT,
    "internalShopNote" TEXT,
    "classification" "public"."ShopClass",
    "startDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopProspect" (
    "id" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "contactPerson" TEXT,
    "zalo" TEXT,
    "address" TEXT,
    "source" "public"."ProspectSource" NOT NULL,
    "sourceDetail" TEXT,
    "productType" TEXT,
    "estimatedSize" "public"."ProspectSize",
    "currentCarrier" TEXT,
    "stage" "public"."PipelineStage" NOT NULL DEFAULT 'DISCOVERED',
    "note" TEXT,
    "lostReason" TEXT,
    "isLost" BOOLEAN NOT NULL DEFAULT false,
    "assigneeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopProspect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TodoComment" (
    "id" TEXT NOT NULL,
    "todoItemId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TodoComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Announcement_createdAt_idx" ON "public"."Announcement"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Announcement_isPinned_idx" ON "public"."Announcement"("isPinned" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementRead_announcementId_userId_key" ON "public"."AnnouncementRead"("announcementId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "AnnouncementRead_userId_idx" ON "public"."AnnouncementRead"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CashbookEntry_compositeKey_key" ON "public"."CashbookEntry"("compositeKey" ASC);

-- CreateIndex
CREATE INDEX "CashbookEntry_groupType_idx" ON "public"."CashbookEntry"("groupType" ASC);

-- CreateIndex
CREATE INDEX "CashbookEntry_receiptCode_idx" ON "public"."CashbookEntry"("receiptCode" ASC);

-- CreateIndex
CREATE INDEX "CashbookEntry_shopName_idx" ON "public"."CashbookEntry"("shopName" ASC);

-- CreateIndex
CREATE INDEX "CashbookEntry_transactionTime_idx" ON "public"."CashbookEntry"("transactionTime" ASC);

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "public"."Expense"("categoryId" ASC);

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "public"."Expense"("date" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON "public"."ExpenseCategory"("name" ASC);

-- CreateIndex
CREATE INDEX "Feedback_isRead_idx" ON "public"."Feedback"("isRead" ASC);

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "public"."Feedback"("userId" ASC);

-- CreateIndex
CREATE INDEX "InfoChangeRequest_status_idx" ON "public"."InfoChangeRequest"("status" ASC);

-- CreateIndex
CREATE INDEX "InfoChangeRequest_userId_idx" ON "public"."InfoChangeRequest"("userId" ASC);

-- CreateIndex
CREATE INDEX "LeaveRequest_leaveStatus_idx" ON "public"."LeaveRequest"("leaveStatus" ASC);

-- CreateIndex
CREATE INDEX "LeaveRequest_userId_idx" ON "public"."LeaveRequest"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyBudget_categoryId_month_key" ON "public"."MonthlyBudget"("categoryId" ASC, "month" ASC);

-- CreateIndex
CREATE INDEX "OrderChangeLog_changeTimestamp_idx" ON "public"."OrderChangeLog"("changeTimestamp" ASC);

-- CreateIndex
CREATE INDEX "OrderChangeLog_changeType_idx" ON "public"."OrderChangeLog"("changeType" ASC);

-- CreateIndex
CREATE INDEX "OrderChangeLog_detectedAt_idx" ON "public"."OrderChangeLog"("detectedAt" ASC);

-- CreateIndex
CREATE INDEX "OrderChangeLog_requestCode_idx" ON "public"."OrderChangeLog"("requestCode" ASC);

-- CreateIndex
CREATE INDEX "OrderChangeLog_uploadHistoryId_idx" ON "public"."OrderChangeLog"("uploadHistoryId" ASC);

-- CreateIndex
CREATE INDEX "ProspectContactLog_prospectId_createdAt_idx" ON "public"."ProspectContactLog"("prospectId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "ShopAssignment_shopId_idx" ON "public"."ShopAssignment"("shopId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ShopAssignment_shopId_userId_key" ON "public"."ShopAssignment"("shopId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "ShopAssignment_userId_idx" ON "public"."ShopAssignment"("userId" ASC);

-- CreateIndex
CREATE INDEX "ShopCareLog_shopId_createdAt_idx" ON "public"."ShopCareLog"("shopId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ShopProfile_shopName_key" ON "public"."ShopProfile"("shopName" ASC);

-- CreateIndex
CREATE INDEX "ShopProspect_assigneeId_idx" ON "public"."ShopProspect"("assigneeId" ASC);

-- CreateIndex
CREATE INDEX "ShopProspect_isLost_idx" ON "public"."ShopProspect"("isLost" ASC);

-- CreateIndex
CREATE INDEX "ShopProspect_stage_idx" ON "public"."ShopProspect"("stage" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "public"."SystemSetting"("key" ASC);

-- CreateIndex
CREATE INDEX "TodoComment_todoItemId_idx" ON "public"."TodoComment"("todoItemId" ASC);

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "public"."Attendance"("date" ASC);

-- CreateIndex
CREATE INDEX "Attendance_userId_date_idx" ON "public"."Attendance"("userId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "ClaimChangeLog_fieldName_changedAt_idx" ON "public"."ClaimChangeLog"("fieldName" ASC, "changedAt" ASC);

-- CreateIndex
CREATE INDEX "ClaimOrder_detectedDate_idx" ON "public"."ClaimOrder"("detectedDate" ASC);

-- CreateIndex
CREATE INDEX "ClaimOrder_isCompleted_claimStatus_idx" ON "public"."ClaimOrder"("isCompleted" ASC, "claimStatus" ASC);

-- CreateIndex
CREATE INDEX "LoginHistory_logoutTime_idx" ON "public"."LoginHistory"("logoutTime" ASC);

-- CreateIndex
CREATE INDEX "LoginHistory_userId_loginTime_idx" ON "public"."LoginHistory"("userId" ASC, "loginTime" ASC);

-- CreateIndex
CREATE INDEX "Order_deliveredDate_idx" ON "public"."Order"("deliveredDate" ASC);

-- CreateIndex
CREATE INDEX "Order_deliveryStatus_createdTime_idx" ON "public"."Order"("deliveryStatus" ASC, "createdTime" ASC);

-- CreateIndex
CREATE INDEX "Order_shopName_deliveryStatus_idx" ON "public"."Order"("shopName" ASC, "deliveryStatus" ASC);

-- CreateIndex
CREATE INDEX "TodoItem_assigneeId_idx" ON "public"."TodoItem"("assigneeId" ASC);

-- CreateIndex
CREATE INDEX "TodoItem_dueDate_idx" ON "public"."TodoItem"("dueDate" ASC);

-- CreateIndex
CREATE INDEX "TodoItem_status_idx" ON "public"."TodoItem"("status" ASC);

-- AddForeignKey
ALTER TABLE "public"."AnnouncementRead" ADD CONSTRAINT "AnnouncementRead_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "public"."Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InfoChangeRequest" ADD CONSTRAINT "InfoChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaveRequest" ADD CONSTRAINT "LeaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MonthlyBudget" ADD CONSTRAINT "MonthlyBudget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderChangeLog" ADD CONSTRAINT "OrderChangeLog_requestCode_fkey" FOREIGN KEY ("requestCode") REFERENCES "public"."Order"("requestCode") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderChangeLog" ADD CONSTRAINT "OrderChangeLog_uploadHistoryId_fkey" FOREIGN KEY ("uploadHistoryId") REFERENCES "public"."UploadHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProspectContactLog" ADD CONSTRAINT "ProspectContactLog_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "public"."ShopProspect"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopAssignment" ADD CONSTRAINT "ShopAssignment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."ShopProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopAssignment" ADD CONSTRAINT "ShopAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopCareLog" ADD CONSTRAINT "ShopCareLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."ShopProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopProspect" ADD CONSTRAINT "ShopProspect_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TodoComment" ADD CONSTRAINT "TodoComment_todoItemId_fkey" FOREIGN KEY ("todoItemId") REFERENCES "public"."TodoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TodoItem" ADD CONSTRAINT "TodoItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TodoItem" ADD CONSTRAINT "TodoItem_linkedOrderId_fkey" FOREIGN KEY ("linkedOrderId") REFERENCES "public"."Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
