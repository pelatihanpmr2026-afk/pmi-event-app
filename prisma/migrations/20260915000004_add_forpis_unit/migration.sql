-- Tambahkan unit FORPIS ke ENUM AsalUnit pada tabel panitia.
ALTER TABLE `panitia` MODIFY `asalUnit` ENUM('KSR_MARKAS', 'KSR_UNSUR', 'KSR_UNPI', 'FORPIS') NOT NULL;