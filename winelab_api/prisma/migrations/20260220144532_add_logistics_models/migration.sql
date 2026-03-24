-- AlterEnum
ALTER TYPE "AssetProcess" ADD VALUE 'UNSERVICED';

-- AlterEnum
ALTER TYPE "ReceivingStatus" ADD VALUE 'IN_TRANSIT';

-- CreateTable
CREATE TABLE "shipment_products" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "shipment_products_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "shipment_products" ADD CONSTRAINT "shipment_products_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_products" ADD CONSTRAINT "shipment_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
