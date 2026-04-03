CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Prisma migrate dev rebuilds a shadow database inside a transaction,
-- so CREATE INDEX CONCURRENTLY would block all future migrations.
CREATE INDEX IF NOT EXISTS "Order_shopName_trgm_idx"
ON "Order" USING GIN ("shopName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Order_receiverName_trgm_idx"
ON "Order" USING GIN ("receiverName" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Order_carrierOrderCode_trgm_idx"
ON "Order" USING GIN ("carrierOrderCode" gin_trgm_ops);
