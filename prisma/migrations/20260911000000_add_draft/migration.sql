-- CreateTable
CREATE TABLE `draft` (
    `id` VARCHAR(191) NOT NULL,
    `namaSekolahKey` VARCHAR(191) NOT NULL,
    `namaSekolah` VARCHAR(255) NOT NULL,
    `currentStep` INTEGER NOT NULL DEFAULT 1,
    `dataSekolah` JSON NULL,
    `dataPeserta` JSON NULL,
    `dataPendamping` JSON NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `draft_namaSekolahKey_key`(`namaSekolahKey`),
    INDEX `draft_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
