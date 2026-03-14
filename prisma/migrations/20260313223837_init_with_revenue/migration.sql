-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'STAFF', 'VIEWER');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PROCESSING', 'IN_TRANSIT', 'DELIVERING', 'DELIVERED', 'RECONCILED', 'DELIVERY_DELAYED', 'RETURN_CONFIRMED', 'RETURNING_FULL', 'RETURN_DELAYED', 'RETURNED_FULL', 'RETURNED_PARTIAL');

-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('FULL_RETURN', 'PARTIAL_RETURN');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('RETURNING', 'AT_WAREHOUSE', 'RETURNED_TO_CUSTOMER');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('LOST', 'DAMAGED', 'WRONG_ITEM', 'SHORTAGE', 'DELAY', 'OTHER');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'COMPENSATED');

-- CreateEnum
CREATE TYPE "TodoStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "department" TEXT,
    "position" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "reconciliationCode" TEXT,
    "reconciliationDate" TIMESTAMP(3),
    "shopName" TEXT,
    "customerOrderCode" TEXT,
    "requestCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdTime" TIMESTAMP(3),
    "pickupTime" TIMESTAMP(3),
    "codAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "codOriginal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "declaredValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "surcharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overweightFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insuranceFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "codServiceFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "returnFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carrierFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ghsvInsuranceFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creatorShopName" TEXT,
    "creatorPhone" TEXT,
    "creatorStaff" TEXT,
    "creatorAddress" TEXT,
    "creatorWard" TEXT,
    "creatorDistrict" TEXT,
    "creatorProvince" TEXT,
    "senderShopName" TEXT,
    "senderPhone" TEXT,
    "senderAddress" TEXT,
    "senderWard" TEXT,
    "senderDistrict" TEXT,
    "senderProvince" TEXT,
    "receiverName" TEXT,
    "receiverPhone" TEXT,
    "receiverAddress" TEXT,
    "receiverWard" TEXT,
    "receiverDistrict" TEXT,
    "receiverProvince" TEXT,
    "deliveryNotes" TEXT,
    "productDescription" TEXT,
    "paymentConfirmDate" TIMESTAMP(3),
    "internalNotes" TEXT,
    "publicNotes" TEXT,
    "lastUpdated" TIMESTAMP(3),
    "carrierName" TEXT,
    "carrierAccount" TEXT,
    "carrierOrderCode" TEXT,
    "regionGroup" TEXT,
    "customerWeight" DOUBLE PRECISION,
    "carrierWeight" DOUBLE PRECISION,
    "deliveredDate" TIMESTAMP(3),
    "pickupShipper" TEXT,
    "deliveryShipper" TEXT,
    "orderSource" TEXT,
    "partialOrderType" TEXT,
    "partialOrderCode" TEXT,
    "salesStaff" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedInDb" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadHistory" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "newOrders" INTEGER NOT NULL,
    "updatedOrders" INTEGER NOT NULL,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "errorLog" TEXT,
    "carrierName" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processingTime" INTEGER,

    CONSTRAINT "UploadHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnTracking" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "returnType" "ReturnType" NOT NULL,
    "returnStatus" "ReturnStatus" NOT NULL DEFAULT 'RETURNING',
    "returnReason" TEXT,
    "warehouseArrivalDate" TIMESTAMP(3),
    "returnedToCustomerDate" TIMESTAMP(3),
    "returnedByStaff" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "claimType" "ClaimType" NOT NULL,
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "issueDescription" TEXT NOT NULL,
    "claimAmount" DOUBLE PRECISION,
    "compensationAmount" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "submittedDate" TIMESTAMP(3),
    "resolvedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TodoItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TodoStatus" NOT NULL DEFAULT 'TODO',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "assigneeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TodoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "totalHours" DOUBLE PRECISION,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loginTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutTime" TIMESTAMP(3),
    "duration" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeScore" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "scorerId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "criteria" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Order_requestCode_key" ON "Order"("requestCode");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_carrierName_idx" ON "Order"("carrierName");

-- CreateIndex
CREATE INDEX "Order_shopName_idx" ON "Order"("shopName");

-- CreateIndex
CREATE INDEX "Order_deliveryStatus_idx" ON "Order"("deliveryStatus");

-- CreateIndex
CREATE INDEX "Order_createdTime_idx" ON "Order"("createdTime");

-- CreateIndex
CREATE INDEX "Order_lastUpdated_idx" ON "Order"("lastUpdated");

-- CreateIndex
CREATE INDEX "Order_receiverProvince_idx" ON "Order"("receiverProvince");

-- CreateIndex
CREATE INDEX "Order_salesStaff_idx" ON "Order"("salesStaff");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnTracking_orderId_key" ON "ReturnTracking"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimOrder_orderId_key" ON "ClaimOrder"("orderId");

-- CreateIndex
CREATE INDEX "ClaimOrder_claimStatus_idx" ON "ClaimOrder"("claimStatus");

-- CreateIndex
CREATE INDEX "ClaimOrder_deadline_idx" ON "ClaimOrder"("deadline");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_date_key" ON "Attendance"("userId", "date");

-- AddForeignKey
ALTER TABLE "UploadHistory" ADD CONSTRAINT "UploadHistory_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnTracking" ADD CONSTRAINT "ReturnTracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimOrder" ADD CONSTRAINT "ClaimOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimOrder" ADD CONSTRAINT "ClaimOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeScore" ADD CONSTRAINT "EmployeeScore_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeScore" ADD CONSTRAINT "EmployeeScore_scorerId_fkey" FOREIGN KEY ("scorerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
