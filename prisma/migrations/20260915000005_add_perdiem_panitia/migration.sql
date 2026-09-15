-- Tambahkan kolom perdiem (nominal insentif, diinput manual oleh admin) pada tabel panitia.
ALTER TABLE `panitia` ADD COLUMN `perdiem` INTEGER NOT NULL DEFAULT 0;
