-- Ubah relasi transaksi-pengajuan dari 1-ke-1 menjadi 1-ke-banyak:
-- satu pengajuan yang disetujui bisa menerima beberapa transaksi belanja manual,
-- dan tiap transaksi mengurangkan sisa anggaran pengajuan terkait.
-- Buat index pengganti dulu karena unique index masih dibutuhkan foreign key.
CREATE INDEX `transaksi_keuangan_pengajuanId_idx` ON `transaksi_keuangan`(`pengajuanId`);
DROP INDEX `transaksi_keuangan_pengajuanId_key` ON `transaksi_keuangan`;