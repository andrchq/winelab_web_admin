ALTER TABLE "initial_inventory_scans"
ADD COLUMN "linkedAssetId" TEXT,
ADD COLUMN "conflictType" TEXT,
ADD COLUMN "sourceWarehouseId" TEXT,
ADD COLUMN "sourceStoreId" TEXT,
ADD COLUMN "sourceProcessStatus" TEXT,
ADD COLUMN "requiresReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reviewedAt" TIMESTAMP(3);

DROP INDEX "initial_inventory_entries_sessionId_productId_key";

CREATE INDEX "initial_inventory_entries_sessionId_productId_idx"
ON "initial_inventory_entries"("sessionId", "productId");
