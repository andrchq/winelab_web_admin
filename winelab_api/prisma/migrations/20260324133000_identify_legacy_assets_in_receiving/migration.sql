ALTER TABLE "assets"
ADD COLUMN "isUnidentified" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "receiving_items"
ADD COLUMN "linkedAssetId" TEXT;

ALTER TABLE "receiving_items"
ADD CONSTRAINT "receiving_items_linkedAssetId_fkey"
FOREIGN KEY ("linkedAssetId") REFERENCES "assets"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
