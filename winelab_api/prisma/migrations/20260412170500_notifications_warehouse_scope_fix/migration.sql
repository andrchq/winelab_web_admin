ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "warehouseId" TEXT;

CREATE INDEX IF NOT EXISTS "notifications_warehouseId_createdAt_idx"
ON "notifications"("warehouseId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_warehouseId_fkey'
  ) THEN
    ALTER TABLE "notifications"
      ADD CONSTRAINT "notifications_warehouseId_fkey"
      FOREIGN KEY ("warehouseId")
      REFERENCES "warehouses"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
