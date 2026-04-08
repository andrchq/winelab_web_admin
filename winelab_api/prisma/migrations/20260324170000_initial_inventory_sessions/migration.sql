ALTER TABLE "warehouses"
ADD COLUMN "initialInventoryCompletedAt" TIMESTAMP(3);

CREATE TYPE "InitialInventoryStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "initial_inventory_sessions" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "InitialInventoryStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "initial_inventory_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "initial_inventory_entries" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "initial_inventory_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "initial_inventory_scans" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "initial_inventory_scans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "initial_inventory_entries_sessionId_productId_key" ON "initial_inventory_entries"("sessionId", "productId");
CREATE UNIQUE INDEX "initial_inventory_scans_entryId_code_key" ON "initial_inventory_scans"("entryId", "code");

ALTER TABLE "initial_inventory_sessions"
ADD CONSTRAINT "initial_inventory_sessions_warehouseId_fkey"
FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "initial_inventory_sessions"
ADD CONSTRAINT "initial_inventory_sessions_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "initial_inventory_entries"
ADD CONSTRAINT "initial_inventory_entries_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "initial_inventory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "initial_inventory_entries"
ADD CONSTRAINT "initial_inventory_entries_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "initial_inventory_scans"
ADD CONSTRAINT "initial_inventory_scans_entryId_fkey"
FOREIGN KEY ("entryId") REFERENCES "initial_inventory_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
