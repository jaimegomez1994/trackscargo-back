/*
  Warnings:

  - A unique constraint covering the columns `[email,organization_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_email_key";

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "weight_unit" TEXT NOT NULL DEFAULT 'kg';

-- CreateIndex
CREATE UNIQUE INDEX "users_email_organization_id_key" ON "users"("email", "organization_id");
