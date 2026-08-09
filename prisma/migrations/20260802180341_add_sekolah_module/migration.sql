-- CreateTable
CREATE TABLE `sekolah` (
    `id` VARCHAR(191) NOT NULL,
    `jenjang` ENUM('SMP', 'MTS', 'SMA', 'SMK', 'MA') NOT NULL,
    `statusSekolah` ENUM('NEGERI', 'SWASTA') NOT NULL,
    `namaInput` VARCHAR(191) NOT NULL,
    `namaLengkap` VARCHAR(191) NOT NULL,
    `kategori` ENUM('WIRA', 'MADYA') NOT NULL,
    `namaPembina` VARCHAR(191) NOT NULL,
    `noWhatsappPembina` VARCHAR(191) NOT NULL,
    `biayaPeserta` INTEGER NOT NULL DEFAULT 0,
    `biayaPendamping` INTEGER NOT NULL DEFAULT 0,
    `biayaTenda` INTEGER NOT NULL DEFAULT 0,
    `totalBiaya` INTEGER NOT NULL DEFAULT 0,
    `statusPendaftaran` ENUM('BELUM_BAYAR', 'MENUNGGU_KONFIRMASI', 'LUNAS', 'DITOLAK') NOT NULL DEFAULT 'BELUM_BAYAR',
    `buktiTransferUrl` TEXT NULL,
    `catatanAdmin` TEXT NULL,
    `excelUrl` TEXT NULL,
    `kwitansiUrl` TEXT NULL,
    `qrToken` VARCHAR(191) NULL,
    `statusDaftarUlang` BOOLEAN NOT NULL DEFAULT false,
    `waktuDaftarUlang` DATETIME(3) NULL,
    `dibayarPada` DATETIME(3) NULL,
    `dikonfirmasiPada` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sekolah_namaLengkap_key`(`namaLengkap`),
    UNIQUE INDEX `sekolah_qrToken_key`(`qrToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `peserta` (
    `id` VARCHAR(191) NOT NULL,
    `sekolahId` VARCHAR(191) NOT NULL,
    `tipe` ENUM('PESERTA', 'PENDAMPING') NOT NULL,
    `namaLengkap` VARCHAR(191) NOT NULL,
    `tempatLahir` VARCHAR(191) NOT NULL,
    `tanggalLahir` DATE NOT NULL,
    `alamat` TEXT NOT NULL,
    `agama` ENUM('ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'LAINNYA') NOT NULL,
    `golonganDarah` ENUM('A', 'B', 'AB', 'O', 'TIDAK_TAHU') NOT NULL,
    `tahunMasuk` INTEGER NOT NULL,
    `noHp` VARCHAR(191) NULL,
    `gender` ENUM('LAKI_LAKI', 'PEREMPUAN') NOT NULL,
    `fotoUrl` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenda_jenis` (
    `id` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `kapasitasMin` INTEGER NOT NULL,
    `kapasitasMax` INTEGER NOT NULL,
    `harga` INTEGER NOT NULL,
    `stokTotal` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenda_sewa` (
    `id` VARCHAR(191) NOT NULL,
    `sekolahId` VARCHAR(191) NOT NULL,
    `tendaJenisId` VARCHAR(191) NOT NULL,
    `jumlah` INTEGER NOT NULL,
    `hargaSatuanSaatSewa` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `peserta` ADD CONSTRAINT `peserta_sekolahId_fkey` FOREIGN KEY (`sekolahId`) REFERENCES `sekolah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenda_sewa` ADD CONSTRAINT `tenda_sewa_sekolahId_fkey` FOREIGN KEY (`sekolahId`) REFERENCES `sekolah`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenda_sewa` ADD CONSTRAINT `tenda_sewa_tendaJenisId_fkey` FOREIGN KEY (`tendaJenisId`) REFERENCES `tenda_jenis`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
