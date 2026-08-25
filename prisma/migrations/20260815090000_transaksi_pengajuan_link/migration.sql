-- AlterTable
ALTER TABLE `transaksi_keuangan` ADD COLUMN `pengajuanId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `transaksi_keuangan_pengajuanId_key` ON `transaksi_keuangan`(`pengajuanId`);

-- AddForeignKey
ALTER TABLE `pembayaran` ADD CONSTRAINT `pembayaran_sekolahId_fkey` FOREIGN KEY (`sekolahId`) REFERENCES `sekolah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaksi_keuangan` ADD CONSTRAINT `transaksi_keuangan_pengajuanId_fkey` FOREIGN KEY (`pengajuanId`) REFERENCES `pengajuan_anggaran`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;