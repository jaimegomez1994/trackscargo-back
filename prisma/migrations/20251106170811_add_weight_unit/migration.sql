-- Drop old index if it exists
-- DROP INDEX IF EXISTS "users_email_key";

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "weight_unit" TEXT NOT NULL DEFAULT 'kg';

-- Create new composite unique index
-- CREATE UNIQUE INDEX IF NOT EXISTS "users_email_organization_id_key" ON "users"("email", "organization_id");
