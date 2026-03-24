-- CreateEnum
CREATE TYPE "ProductAccountingType" AS ENUM ('SERIALIZED', 'QUANTITY');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "accountingType" "ProductAccountingType" NOT NULL DEFAULT 'SERIALIZED';
