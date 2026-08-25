/*
  Warnings:

  - A unique constraint covering the columns `[sekolahId,tipe,batchKe]` on the table `pembayaran` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `pembayaran` DROP FOREIGN KEY `pembayaran_sekolahId_fkey`;

-- DropIndex
DROP INDEX `pembayaran_sekolahId_tipe_key` ON `pembayaran`;

-- AlterTable
ALTER TABLE `pembayaran` ADD COLUMN `batchKe` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `peserta` ADD COLUMN `batchKe` INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX `pembayaran_sekolahId_tipe_batchKe_key` ON `pembayaran`(`sekolahId`, `tipe`, `batchKe`);

-- NOTE: FK `tenda_sewa_sekolahId_fkey` sudah dibuat di migrasi add_sekolah_module.
-- Baris AddForeignKey duplikat di sini membuat shadow DB replay gagal (P3018/1826).

