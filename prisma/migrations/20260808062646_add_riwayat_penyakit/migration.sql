/*
  Warnings:

  - You are about to drop the column `suratPernyataanUrl` on the `peserta` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `peserta` DROP COLUMN `suratPernyataanUrl`,
    ADD COLUMN `riwayatPenyakit` ENUM('TIDAK_ADA', 'ASMA_BERAT', 'EPILEPSI', 'JANTUNG', 'DIABETES', 'HIPERTENSI_BERAT', 'GANGGUAN_GINJAL', 'GANGGUAN_PERNAPASAN_KRONIS', 'RIWAYAT_KEJANG', 'HEMOFILIA', 'ANEMIA_BERAT', 'LAINNYA') NULL;
