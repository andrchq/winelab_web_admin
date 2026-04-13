CREATE TYPE "CategoryType" AS ENUM ('REQUIRED', 'OPTIONAL', 'ACCESSORY');

ALTER TABLE "equipment_categories"
ADD COLUMN "categoryType" "CategoryType" NOT NULL DEFAULT 'OPTIONAL';

WITH RECURSIVE accessory_tree AS (
    SELECT "id"
    FROM "equipment_categories"
    WHERE "code" = 'ACCESSORY'

    UNION ALL

    SELECT child."id"
    FROM "equipment_categories" child
    INNER JOIN accessory_tree parent_tree
        ON child."parentId" = parent_tree."id"
)
UPDATE "equipment_categories"
SET "categoryType" = 'ACCESSORY'
WHERE "id" IN (SELECT "id" FROM accessory_tree);

UPDATE "equipment_categories"
SET "categoryType" = 'REQUIRED'
WHERE "isMandatory" = true
  AND "categoryType" <> 'ACCESSORY';

UPDATE "equipment_categories"
SET "isMandatory" = CASE
    WHEN "categoryType" = 'REQUIRED' THEN true
    ELSE false
END;
