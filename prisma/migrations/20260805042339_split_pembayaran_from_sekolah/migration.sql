/*
  Warnings:

  - You are about to drop the column `biayaPendamping` on the `sekolah` table. All the data in the column will be lost.
  - You are about to drop the column `biayaPeserta` on the `sekolah` table. All the data in the column will be lost.
  - You are about to drop the column `biayaTenda` on the `sekolah` table. All the data in the column will be lost.
  - You are about to drop the column `buktiTransferUrl` on the `sekolah` table. All the data in the column will be lost.
  - You are about to drop the column `catatanAdmin` on the `sekolah` table. All the data in the column will be lost.
  - You are about to drop the column `dibayarPada` on the `sekolah` table. All the data in the column will be lost.
  - You are about to drop the column `dikonfirmasiPada` on the `sekolah` table. All the data in the column will be lost.
  - You are about to drop the column `kwitansiUrl` on the `sekolah` table. All the data in the column will be lost.
  - You are about to drop the column `qrToken` on the `sekolah` table. All the data in the column will be lost.
  - You are about to drop the column `statusDaftarUlang` on the `sekolah` table. All the data in the column will be lost.
  - You are about to drop the column `statusPendaftaran` on the `sekolah` table. All the data in the column will be lost.
  - You are about to drop the column `totalBiaya` on the `sekolah` table. All the data in the column will be lost.
  - You are about to drop the column `waktuDaftarUlang` on the `sekolah` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `sekolah_qrToken_key` ON `sekolah`;

-- AlterTable
ALTER TABLE `sekolah` DROP COLUMN `biayaPendamping`,
    DROP COLUMN `biayaPeserta`,
    DROP COLUMN `biayaTenda`,
    DROP COLUMN `buktiTransferUrl`,
    DROP COLUMN `catatanAdmin`,
    DROP COLUMN `dibayarPada`,
    DROP COLUMN `dikonfirmasiPada`,
    DROP COLUMN `kwitansiUrl`,
    DROP COLUMN `qrToken`,
    DROP COLUMN `statusDaftarUlang`,
    DROP COLUMN `statusPendaftaran`,
    DROP COLUMN `totalBiaya`,
    DROP COLUMN `waktuDaftarUlang`,
    ADD COLUMN `estimasiPesertaPendamping` INTEGER NULL;

-- CreateTable
CREATE TABLE `pembayaran` (
    `id` VARCHAR(191) NOT NULL,
    `sekolahId` VARCHAR(191) NOT NULL,
    `tipe` ENUM('PESERTA', 'TENDA') NOT NULL,
    `jumlahBiaya` INTEGER NOT NULL,
    `statusPembayaran` ENUM('BELUM_BAYAR', 'MENUNGGU_KONFIRMASI', 'LUNAS', 'DITOLAK') NOT NULL DEFAULT 'BELUM_BAYAR',
    `buktiTransferUrl` TEXT NULL,
    `catatanAdmin` TEXT NULL,
    `kwitansiUrl` TEXT NULL,
    `qrToken` VARCHAR(191) NULL,
    `statusDaftarUlang` BOOLEAN NOT NULL DEFAULT false,
    `waktuDaftarUlang` DATETIME(3) NULL,
    `dibayarPada` DATETIME(3) NULL,
    `dikonfirmasiPada` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pembayaran_qrToken_key`(`qrToken`),
    UNIQUE INDEX `pembayaran_sekolahId_tipe_key`(`sekolahId`, `tipe`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pembayaran` ADD CONSTRAINT `pembayaran_sekolahId_fkey` FOREIGN KEY (`sekolahId`) REFERENCES `sekolah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
