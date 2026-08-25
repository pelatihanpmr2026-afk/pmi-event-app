CREATE TABLE `reservasi_tenda` (
  `id` VARCHAR(191) NOT NULL,
  `namaSekolah` VARCHAR(191) NOT NULL,
  `kategori` ENUM('WIRA', 'MADYA') NOT NULL,
  `namaPembina` VARCHAR(191) NOT NULL,
  `noWhatsappPembina` VARCHAR(191) NOT NULL,
  `estimasiPesertaPendamping` INTEGER NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `reservasi_tenda_expiresAt_idx`(`expiresAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `reservasi_tenda_item` (
  `id` VARCHAR(191) NOT NULL,
  `reservasiId` VARCHAR(191) NOT NULL,
  `tendaJenisId` VARCHAR(191) NOT NULL,
  `jumlah` INTEGER NOT NULL,
  `hargaSatuan` INTEGER NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `reservasi_tenda_item_reservasiId_tendaJenisId_key`(`reservasiId`, `tendaJenisId`),
  CONSTRAINT `reservasi_tenda_item_reservasiId_fkey` FOREIGN KEY (`reservasiId`) REFERENCES `reservasi_tenda`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reservasi_tenda_item_tendaJenisId_fkey` FOREIGN KEY (`tendaJenisId`) REFERENCES `tenda_jenis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
