ALTER TABLE "warehouses"
ADD COLUMN "contactName" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "email" TEXT;

ALTER TABLE "requests"
ADD COLUMN "deliveryContactName" TEXT,
ADD COLUMN "deliveryContactPhone" TEXT,
ADD COLUMN "deliveryComment" TEXT;

ALTER TABLE "deliveries"
ADD COLUMN "externalVersion" INTEGER,
ADD COLUMN "trackingUrl" TEXT,
ADD COLUMN "rawStatus" TEXT,
ADD COLUMN "sourceContactName" TEXT,
ADD COLUMN "sourceContactPhone" TEXT,
ADD COLUMN "sourceContactEmail" TEXT,
ADD COLUMN "recipientContactName" TEXT,
ADD COLUMN "recipientContactPhone" TEXT,
ADD COLUMN "recipientComment" TEXT,
ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "lastSyncAt" TIMESTAMP(3);
