-- AlterTable
ALTER TABLE "asset_history" ADD COLUMN     "details" TEXT,
ADD COLUMN     "fromStatus" TEXT,
ADD COLUMN     "toStatus" TEXT;

-- CreateTable
CREATE TABLE "inventory_sessions" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "inventory_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_records" (
    "id" TEXT NOT NULL,
    "inventorySessionId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3),
    "scannedById" TEXT,

    CONSTRAINT "inventory_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_records_inventorySessionId_assetId_key" ON "inventory_records"("inventorySessionId", "assetId");

-- AddForeignKey
ALTER TABLE "asset_history" ADD CONSTRAINT "asset_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_sessions" ADD CONSTRAINT "inventory_sessions_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_sessions" ADD CONSTRAINT "inventory_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_records" ADD CONSTRAINT "inventory_records_inventorySessionId_fkey" FOREIGN KEY ("inventorySessionId") REFERENCES "inventory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_records" ADD CONSTRAINT "inventory_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_records" ADD CONSTRAINT "inventory_records_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
