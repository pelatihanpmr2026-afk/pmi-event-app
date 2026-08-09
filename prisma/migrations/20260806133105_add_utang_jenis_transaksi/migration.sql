-- AlterTable
ALTER TABLE `transaksi_keuangan` MODIFY `jenis` ENUM('PEMASUKAN', 'PENGELUARAN', 'UTANG') NOT NULL;
