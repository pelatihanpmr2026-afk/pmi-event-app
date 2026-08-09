/*
  Warnings:

  - A unique constraint covering the columns `[kodePendaftaran]` on the table `sekolah` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `kodePendaftaran` to the `sekolah` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nomorPendaftaran` to the `sekolah` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tahunPendaftaran` to the `sekolah` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `sekolah` ADD COLUMN `kodePendaftaran` VARCHAR(191) NOT NULL,
    ADD COLUMN `nomorPendaftaran` INTEGER NOT NULL,
    ADD COLUMN `tahunPendaftaran` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `sekolah_kodePendaftaran_key` ON `sekolah`(`kodePendaftaran`);
