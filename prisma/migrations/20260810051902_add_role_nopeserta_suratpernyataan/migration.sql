/*
  Warnings:

  - A unique constraint covering the columns `[noPeserta]` on the table `peserta` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `admin` ADD COLUMN `role` ENUM('SUPERADMIN', 'KESEKRETARIATAN', 'KEUANGAN', 'ACARA') NOT NULL DEFAULT 'SUPERADMIN';

-- AlterTable
ALTER TABLE `peserta` ADD COLUMN `noPeserta` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sekolah` ADD COLUMN `suratPernyataanUrl` TEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `peserta_noPeserta_key` ON `peserta`(`noPeserta`);
