-- Ubah relasi transaksi-pengajuan dari 1-ke-1 menjadi 1-ke-banyak:
-- satu pengajuan yang disetujui bisa menerima beberapa transaksi belanja manual,
-- dan tiap transaksi mengurangkan sisa anggaran pengajuan terkait.
DROP INDEX `transaksi_keuangan_pengajuanId_key` ON `transaksi_keuangan`;