-- CreateTable
CREATE TABLE `absensi_sesi` (
    `id` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `tanggal` DATE NOT NULL,
    `jamMulai` VARCHAR(191) NOT NULL,
    `jamSelesai` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `absensi_log` (
    `id` VARCHAR(191) NOT NULL,
    `panitiaId` VARCHAR(191) NOT NULL,
    `sesiId` VARCHAR(191) NOT NULL,
    `scannedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `absensi_log_panitiaId_sesiId_key`(`panitiaId`, `sesiId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `absensi_log` ADD CONSTRAINT `absensi_log_panitiaId_fkey` FOREIGN KEY (`panitiaId`) REFERENCES `panitia`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `absensi_log` ADD CONSTRAINT `absensi_log_sesiId_fkey` FOREIGN KEY (`sesiId`) REFERENCES `absensi_sesi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
