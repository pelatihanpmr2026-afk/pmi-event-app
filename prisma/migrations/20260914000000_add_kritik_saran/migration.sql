-- CreateTable
CREATE TABLE `kritik_saran` (
    `id` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(100) NULL,
    `pesan` TEXT NOT NULL,
    `ratingPendaftaran` INTEGER NOT NULL DEFAULT 0,
    `ratingPerkemahan` INTEGER NOT NULL DEFAULT 0,
    `ratingAcara` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `kritik_saran_createdAt_idx` ON `kritik_saran`(`createdAt`);
