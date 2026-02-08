-- AlterTable
ALTER TABLE "receiving_sessions" ADD COLUMN     "type" TEXT DEFAULT 'manual';

-- CreateTable
CREATE TABLE "receiving_scans" (
    "id" TEXT NOT NULL,
    "receivingItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "code" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receiving_scans_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "receiving_scans" ADD CONSTRAINT "receiving_scans_receivingItemId_fkey" FOREIGN KEY ("receivingItemId") REFERENCES "receiving_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
