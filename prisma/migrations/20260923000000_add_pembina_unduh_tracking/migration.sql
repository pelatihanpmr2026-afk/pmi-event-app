-- Tambah kolom tracking unduhan sertifikat dari halaman publik
ALTER TABLE `pembina` ADD COLUMN `sudahUnduh` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `pembina` ADD COLUMN `diunduhPada` DATETIME(3) NULL;
ALTER TABLE `pembina` ADD COLUMN `jumlahUnduhan` INTEGER NOT NULL DEFAULT 0;
