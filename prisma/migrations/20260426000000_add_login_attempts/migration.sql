-- Per-attempt audit log for the credentials login flow.
-- Captures both success and failure paths so we can spot brute-force
-- patterns by email or IP. Email is stored verbatim to support forensic
-- queries even when the email never matches an existing user.
--
-- This migration was generated via `prisma migrate diff --from-empty` and
-- hand-trimmed to only the LoginAttempt table — DB drift on the rest of
-- the schema is unrelated and will be reconciled separately.

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipAddress_createdAt_idx" ON "LoginAttempt"("ipAddress", "createdAt");
