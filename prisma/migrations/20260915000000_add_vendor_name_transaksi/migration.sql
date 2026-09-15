ALTER TABLE `transaksi_keuangan` ADD COLUMN `vendor_name` VARCHAR(255) NULL;

CREATE INDEX `transaksi_keuangan_vendor_name_idx` ON `transaksi_keuangan`(`vendor_name`);
