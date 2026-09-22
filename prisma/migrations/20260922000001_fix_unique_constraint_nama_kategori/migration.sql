-- Drop旧的 unique constraint pada namaLengkap saja
ALTER TABLE `sekolah` DROP INDEX `sekolah_namaLengkap_key`;

-- Buat composite unique constraint: namaLengkap + kategori
CREATE UNIQUE INDEX `sekolah_namaLengkap_kategori_key` ON `sekolah`(`namaLengkap`, `kategori`);
