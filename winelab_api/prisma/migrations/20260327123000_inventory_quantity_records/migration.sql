-- CreateTable
CREATE TABLE "inventory_quantity_records" (
    "id" TEXT NOT NULL,
    "inventorySessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "expectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "countedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_quantity_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_quantity_records_inventorySessionId_productId_key"
ON "inventory_quantity_records"("inventorySessionId", "productId");

-- AddForeignKey
ALTER TABLE "inventory_quantity_records"
ADD CONSTRAINT "inventory_quantity_records_inventorySessionId_fkey"
FOREIGN KEY ("inventorySessionId") REFERENCES "inventory_sessions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_quantity_records"
ADD CONSTRAINT "inventory_quantity_records_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
