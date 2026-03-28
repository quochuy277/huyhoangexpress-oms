-- Claims workload indexes for serverless Postgres/Supabase access patterns
CREATE INDEX IF NOT EXISTS "ClaimOrder_isCompleted_deadline_idx"
ON "ClaimOrder"("isCompleted", "deadline");

CREATE INDEX IF NOT EXISTS "ClaimOrder_isCompleted_detectedDate_idx"
ON "ClaimOrder"("isCompleted", "detectedDate");

CREATE INDEX IF NOT EXISTS "ClaimOrder_claimStatus_detectedDate_idx"
ON "ClaimOrder"("claimStatus", "detectedDate");

CREATE INDEX IF NOT EXISTS "ClaimOrder_issueType_isCompleted_idx"
ON "ClaimOrder"("issueType", "isCompleted");

CREATE INDEX IF NOT EXISTS "ClaimStatusHistory_changedBy_changedAt_idx"
ON "ClaimStatusHistory"("changedBy", "changedAt");

CREATE INDEX IF NOT EXISTS "ClaimChangeLog_changedBy_changedAt_idx"
ON "ClaimChangeLog"("changedBy", "changedAt");
