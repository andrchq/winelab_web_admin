-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "warehouseId" TEXT;

-- CreateIndex
CREATE INDEX "notifications_warehouseId_createdAt_idx" ON "notifications"("warehouseId", "createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
