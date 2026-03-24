-- DropForeignKey
ALTER TABLE "shipments" DROP CONSTRAINT "shipments_requestId_fkey";

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "destinationId" TEXT,
ADD COLUMN     "destinationName" TEXT,
ADD COLUMN     "destinationType" TEXT,
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "linkedReceivingId" TEXT,
ADD COLUMN     "requestNumber" TEXT,
ADD COLUMN     "supplier" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'manual',
ALTER COLUMN "requestId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "shipment_lines" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "productId" TEXT,
    "originalName" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "expectedQuantity" INTEGER NOT NULL DEFAULT 0,
    "scannedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_scans" (
    "id" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "code" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_scans_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_lines" ADD CONSTRAINT "shipment_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_scans" ADD CONSTRAINT "shipment_scans_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "shipment_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
