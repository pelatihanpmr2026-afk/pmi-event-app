-- CreateTable
CREATE TABLE `pengajuan_anggaran` (
    `id` VARCHAR(191) NOT NULL,
    `nomorPengajuan` VARCHAR(191) NOT NULL,
    `namaKoordinator` VARCHAR(191) NOT NULL,
    `divisi` ENUM('KOMANDAN', 'KETUA_PELAKSANA', 'WAKIL_KETUA', 'BENDAHARA', 'WAKIL_BENDAHARA_1', 'WAKIL_BENDAHARA_2', 'SEKRETARIS', 'WAKIL_SEKRETARIS', 'KESEKRETARIATAN', 'ACARA', 'HUMAS_DAN_DOKUMENTASI', 'GIAT', 'KEAMANAN_DAN_EVAKUASI', 'SANITASI', 'TRANSPORTASI', 'PERKEMAHAN', 'DAPUR_UMUM', 'PERALATAN', 'YANKES') NOT NULL,
    `noHp` VARCHAR(191) NOT NULL,
    `totalJenisBarang` INTEGER NOT NULL,
    `totalKuantitas` INTEGER NOT NULL,
    `totalPengajuan` INTEGER NOT NULL,
    `tandaTanganUrl` TEXT NULL,
    `pdfUrl` TEXT NULL,
    `status` ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
    `catatanAdmin` TEXT NULL,
    `diprosesPada` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pengajuan_anggaran_nomorPengajuan_key`(`nomorPengajuan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengajuan_item` (
    `id` VARCHAR(191) NOT NULL,
    `pengajuanId` VARCHAR(191) NOT NULL,
    `namaBarang` VARCHAR(191) NOT NULL,
    `qty` INTEGER NOT NULL,
    `hargaSatuan` INTEGER NOT NULL,
    `total` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pengajuan_item` ADD CONSTRAINT `pengajuan_item_pengajuanId_fkey` FOREIGN KEY (`pengajuanId`) REFERENCES `pengajuan_anggaran`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
