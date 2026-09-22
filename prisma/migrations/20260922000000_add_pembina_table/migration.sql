-- CreateTable
CREATE TABLE `pembina` (
    `id` VARCHAR(191) NOT NULL,
    `sekolahId` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pembina_sekolahId_idx`(`sekolahId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pembina` ADD CONSTRAINT `pembina_sekolahId_fkey` FOREIGN KEY (`sekolahId`) REFERENCES `sekolah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
