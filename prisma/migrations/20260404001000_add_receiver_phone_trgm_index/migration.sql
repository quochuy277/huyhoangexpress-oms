CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Order_receiverPhone_trgm_idx"
ON "Order" USING GIN ("receiverPhone" gin_trgm_ops);
