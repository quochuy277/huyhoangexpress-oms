-- Phase 9: Attendance System Migration
-- Run as: psql -f prisma/migrations/phase9_attendance.sql

-- ==================================
-- 1. SystemSetting model
-- ==================================
CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "key"       TEXT NOT NULL,
  "value"     TEXT NOT NULL,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_key_key" ON "SystemSetting"("key");

-- Seed default settings
INSERT INTO "SystemSetting" ("id", "key", "value", "updatedAt") VALUES
  (gen_random_uuid()::text, 'attendance_late_time',      '08:30',             CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'attendance_auto_logout',    '00:00',             CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'attendance_idle_timeout',   '60',                CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'attendance_full_day_hours', '4',                 CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'attendance_half_day_hours', '2',                 CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'attendance_timezone',       'Asia/Ho_Chi_Minh',  CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- ==================================
-- 2. Upgrade LoginHistory
-- ==================================
DO $$ BEGIN
  ALTER TABLE "LoginHistory" ADD COLUMN "deviceType" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LoginHistory" ADD COLUMN "logoutReason" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "LoginHistory_userId_loginTime_idx" ON "LoginHistory"("userId", "loginTime");

-- ==================================
-- 3. Upgrade Attendance model
-- ==================================
-- Add new columns
DO $$ BEGIN
  ALTER TABLE "Attendance" ADD COLUMN "firstLogin" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Attendance" ADD COLUMN "lastLogout" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Attendance" ADD COLUMN "totalMinutes" INT NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Attendance" ADD COLUMN "isLate" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Attendance" ADD COLUMN "lateMinutes" INT NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Attendance" ADD COLUMN "isManualEdit" BOOLEAN NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Attendance" ADD COLUMN "editedBy" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Attendance" ADD COLUMN "editNote" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Drop old columns that are replaced
DO $$ BEGIN
  ALTER TABLE "Attendance" DROP COLUMN "checkIn";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Attendance" DROP COLUMN "checkOut";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Attendance" DROP COLUMN "totalHours";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Attendance" DROP COLUMN "notes";
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Update AttendanceStatus enum: add UNAPPROVED_LEAVE
DO $$ BEGIN
  ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'UNAPPROVED_LEAVE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Remove old LATE value — we now use isLate boolean. 
-- Can't remove enum values in PG, so we'll just not use LATE anymore.

-- Add indexes
CREATE INDEX IF NOT EXISTS "Attendance_date_idx" ON "Attendance"("date");
CREATE INDEX IF NOT EXISTS "Attendance_userId_date_idx" ON "Attendance"("userId", "date");

-- ==================================
-- 4. LeaveRequest model + enum
-- ==================================
DO $$ BEGIN
  CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "LeaveRequest" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"        TEXT NOT NULL,
  "dateFrom"      DATE NOT NULL,
  "dateTo"        DATE NOT NULL,
  "totalDays"     INT NOT NULL,
  "reason"        TEXT NOT NULL,
  "leaveStatus"   "LeaveStatus" NOT NULL DEFAULT 'PENDING',
  "approvedBy"    TEXT,
  "approvedAt"    TIMESTAMP(3),
  "rejectedBy"    TEXT,
  "rejectedAt"    TIMESTAMP(3),
  "rejectReason"  TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LeaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LeaveRequest_userId_idx" ON "LeaveRequest"("userId");
CREATE INDEX IF NOT EXISTS "LeaveRequest_leaveStatus_idx" ON "LeaveRequest"("leaveStatus");
