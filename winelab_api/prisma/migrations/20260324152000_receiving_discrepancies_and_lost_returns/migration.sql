ALTER TYPE "AssetProcess" ADD VALUE IF NOT EXISTS 'LOST_IN_TRANSIT';

ALTER TABLE "receiving_sessions"
ADD COLUMN "hasDiscrepancy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "discrepancyDetails" TEXT;
