-- Create TodoSource enum
DO $$ BEGIN
  CREATE TYPE "TodoSource" AS ENUM ('MANUAL', 'FROM_DELAYED', 'FROM_RETURNS', 'FROM_CLAIMS', 'FROM_ORDERS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to TodoItem (if not exist)
DO $$ BEGIN
  ALTER TABLE "TodoItem" ADD COLUMN "linkedOrderId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TodoItem" ADD COLUMN "source" "TodoSource" NOT NULL DEFAULT 'MANUAL';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TodoItem" ADD COLUMN "createdById" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TodoItem" ADD COLUMN "completedAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Set createdById = assigneeId for existing rows
UPDATE "TodoItem" SET "createdById" = "assigneeId" WHERE "createdById" IS NULL;

-- Make createdById NOT NULL
ALTER TABLE "TodoItem" ALTER COLUMN "createdById" SET NOT NULL;

-- Change description to TEXT type
ALTER TABLE "TodoItem" ALTER COLUMN "description" TYPE TEXT;

-- Drop old User->TodoItem FK if it references the old relation name
DO $$ BEGIN
  ALTER TABLE "TodoItem" DROP CONSTRAINT IF EXISTS "TodoItem_assigneeId_fkey";
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Re-add assignee FK
DO $$ BEGIN
  ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add createdBy FK
DO $$ BEGIN
  ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add linkedOrder FK
DO $$ BEGIN
  ALTER TABLE "TodoItem" ADD CONSTRAINT "TodoItem_linkedOrderId_fkey" FOREIGN KEY ("linkedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create TodoComment table
CREATE TABLE IF NOT EXISTS "TodoComment" (
  "id" TEXT NOT NULL,
  "todoItemId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TodoComment_pkey" PRIMARY KEY ("id")
);

-- TodoComment FK
DO $$ BEGIN
  ALTER TABLE "TodoComment" ADD CONSTRAINT "TodoComment_todoItemId_fkey" FOREIGN KEY ("todoItemId") REFERENCES "TodoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "TodoItem_assigneeId_idx" ON "TodoItem"("assigneeId");
CREATE INDEX IF NOT EXISTS "TodoItem_status_idx" ON "TodoItem"("status");
CREATE INDEX IF NOT EXISTS "TodoItem_dueDate_idx" ON "TodoItem"("dueDate");
CREATE INDEX IF NOT EXISTS "TodoComment_todoItemId_idx" ON "TodoComment"("todoItemId");
