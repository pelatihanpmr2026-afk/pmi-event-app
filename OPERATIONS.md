# PMI Event App — Dokumentasi Operasional

Dokumen ini adalah panduan maintenance dan deployment production untuk project PMI Event App.

## 1. Ringkasan arsitektur

- Framework: Next.js 16 (`next start` pada production)
- Runtime: Node.js minimal 20.9; gunakan versi LTS
- Database: MySQL melalui Prisma 6
- Process manager: PM2
- Reverse proxy dan HTTPS: Nginx + Certbot
- Port publik: `80` dan `443`
- Port SSH: `22`
- Port internal aplikasi: `3000` — jangan dibuka ke internet
- File upload: `storage/uploads`
- File environment production: `.env` di root project
- Timezone aplikasi: `Asia/Jakarta` melalui konfigurasi PM2

Alur request:

```text
Domain → Nginx (:80/:443) → Next.js/PM2 (:3000) → Prisma → MySQL
```

## 2. Informasi yang harus disimpan secara aman

Simpan di password manager, bukan di Git:

- IP VPS
- User SSH dan metode login (password/key)
- Password user database
- Nilai `JWT_SECRET`, `SUSULAN_JWT_SECRET`, dan `CRON_SECRET`
- Username/password admin aplikasi
- Token WhatsApp Meta jika digunakan
- Nama domain dan akses registrar/DNS
- Lokasi backup database dan file upload

Jangan commit `.env`, dump database, private key, atau isi `storage/uploads` ke repository.

## 3. Struktur file penting

```text
package.json              Script install, build, start, dan seed
package-lock.json         Lock versi dependency; gunakan npm ci di server
prisma/schema.prisma      Model database
prisma/migrations/        Riwayat migration production
prisma/seed.ts            Seed admin dan data awal tenda
src/lib/save-file.ts      Penyimpanan file ke storage/uploads
storage/uploads/          Data upload runtime; wajib dibackup
ecosystem.config.js       Konfigurasi PM2
next.config.ts            Konfigurasi Next.js
.env                      Rahasia dan konfigurasi runtime; tidak di-commit
```

Catatan: kode penyimpanan file saat ini menggunakan `storage/uploads` relatif terhadap root project. Variabel `UPLOAD_DIR` yang mungkin ada di `.env` tidak menjadi sumber lokasi penyimpanan saat ini.

Data `TendaJenis` memiliki `gambarUrl` untuk gambar publik dan `noWhatsappVendor` untuk kontak internal admin. Nomor WhatsApp vendor tidak dikirim ke tampilan publik sewa tenda.

## 4. Konfigurasi `.env` production

Contoh minimal:

```env
NODE_ENV=production
DATABASE_URL="mysql://pmi_app:PASSWORD@127.0.0.1:3306/pmi_event"
NEXT_PUBLIC_BASE_URL="https://pmi-cianjur.com"

JWT_SECRET="secret-acak-panjang"
SUSULAN_JWT_SECRET="secret-acak-lain"
CRON_SECRET="secret-cron-acak"

ADMIN_INITIAL_USERNAME="admin"
ADMIN_INITIAL_PASSWORD="password-kuat"

KTA_INITIAL_USERNAME=""
KTA_INITIAL_PASSWORD=""

WA_SENDER_NUMBER=""
WA_META_TOKEN=""
WA_META_PHONE_NUMBER_ID=""
WA_META_USE_TEMPLATE="false"
WA_TEMPLATE_DISETUJUI="pengajuan_disetujui"
WA_TEMPLATE_DITOLAK="pengajuan_ditolak"
```

Generate secret baru di VPS dengan:

```bash
openssl rand -base64 32
```

Amankan file:

```bash
chmod 600 .env
```

Jika password database berisi karakter khusus, URL-encode karakter tersebut dalam `DATABASE_URL`.

## 5. Deployment pertama

Contoh asumsi:

- User server: `deploy`
- Project: `/home/deploy/pmi-event-app`
- Database: `pmi_event`
- Aplikasi: port `3000`

```bash
cd /home/deploy/pmi-event-app
npm ci
npx prisma migrate deploy
npx prisma db seed
mkdir -p storage/uploads
npm run build
pm2 start ecosystem.config.js --only pmi-event
pm2 save
```

Tes lokal di VPS:

```bash
curl http://127.0.0.1:3000
pm2 status
pm2 logs pmi-event --lines 100
```

Konfigurasi `ecosystem.config.js` production hanya menjalankan `pmi-event` pada `127.0.0.1:3000`. Nginx menjadi satu-satunya service yang menerima traffic publik.

Timezone PM2 harus tetap `Asia/Jakarta` karena jadwal sesi absensi menggunakan waktu WIB. Jangan menghapus variable `TZ` dari konfigurasi PM2.

## 6. Update aplikasi setelah perubahan kode

### 6.1 Sebelum update

Backup database dan upload terlebih dahulu:

```bash
mkdir -p /home/deploy/backups

mysqldump --no-tablespaces --single-transaction \
  -u pmi_app -p pmi_event \
  | gzip > /home/deploy/backups/before_update_$(date +%F_%H-%M).sql.gz

tar -czf /home/deploy/backups/uploads_before_update_$(date +%F_%H-%M).tar.gz \
  /home/deploy/pmi-event-app/storage/uploads
```

### 6.2 Update standar dari Git

```bash
cd /home/deploy/pmi-event-app
git pull --ff-only
npm ci
npx prisma migrate deploy
npm run build
pm2 restart pmi-event
pm2 save
```

Jika tidak ada migration baru, `npx prisma migrate deploy` tetap aman dijalankan.

Migration gambar dan nomor WhatsApp vendor menambahkan kolom nullable, sehingga data tenda lama tetap dapat digunakan. Setelah migration, isi nomor vendor melalui menu `Dashboard → Kelola Tenda`.

### 6.3 Verifikasi setelah update

```bash
pm2 status
pm2 logs pmi-event --lines 100
curl -I http://127.0.0.1:3000
```

Kemudian cek dari browser:

- halaman utama
- login admin
- pembuatan dan pencarian data
- upload file
- download PDF/Excel
- QR code dan absensi
- pembayaran
- modul tenda
- modul anggaran
- WhatsApp jika diaktifkan

## 7. Aturan Prisma dan database

### Perubahan schema di komputer development

Setelah mengubah `prisma/schema.prisma`, buat migration di development:

```bash
npx prisma migrate dev --name nama_perubahan
npx prisma generate
```

Review file SQL yang dibuat, lalu commit seluruh folder migration bersama schema:

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Tambah migration nama-perubahan"
```

### Di production

Gunakan hanya:

```bash
npx prisma migrate deploy
```

Jangan gunakan di production:

```bash
npx prisma migrate dev
npx prisma migrate reset
```

Kedua command tersebut ditujukan untuk development dan `migrate reset` dapat menghapus data.

### Seed

Seed dapat dijalankan dengan:

```bash
npx prisma db seed
```

Seed dirancang melewati akun/data yang sudah ada. Tetap lakukan backup sebelum menjalankannya.

## 8. Backup dan restore

### Membuat backup database

```bash
mysqldump --no-tablespaces --single-transaction \
  -u pmi_app -p pmi_event \
  | gzip > /home/deploy/backups/pmi_event_$(date +%F_%H-%M).sql.gz
```

Opsi `--no-tablespaces` diperlukan jika user database tidak memiliki privilege `PROCESS`.

### Membackup upload

```bash
tar -czf /home/deploy/backups/uploads_$(date +%F_%H-%M).tar.gz \
  /home/deploy/pmi-event-app/storage/uploads
```

### Menyalin backup ke komputer Windows

Jalankan dari PowerShell lokal, bukan dari VPS:

```powershell
scp deploy@IP_VPS:/home/deploy/backups/nama-file.sql.gz C:\Users\NamaUser\Downloads\
```

Untuk folder upload:

```powershell
scp -r deploy@IP_VPS:/home/deploy/backups/uploads_nama-file.tar.gz C:\Users\NamaUser\Downloads\
```

Password yang diminta oleh `scp` adalah password SSH user `deploy`, bukan password MySQL.

### Restore database

Restore akan menimpa data sesuai isi dump. Pastikan backup dan database target sudah benar.

```bash
gunzip -c /home/deploy/backups/nama-file.sql.gz \
  | mysql -u pmi_app -p pmi_event
```

Restore upload:

```bash
tar -xzf /home/deploy/backups/uploads_nama-file.tar.gz -C /
sudo chown -R deploy:deploy /home/deploy/pmi-event-app/storage
```

## 9. PM2 dan log

```bash
pm2 status
pm2 restart pmi-event
pm2 stop pmi-event
pm2 start pmi-event
pm2 logs pmi-event
pm2 logs pmi-event --lines 200
pm2 monit
```

Setelah perubahan konfigurasi PM2:

```bash
pm2 save
```

Jika aplikasi tidak otomatis hidup setelah reboot, jalankan:

```bash
pm2 startup
```

Kemudian jalankan command `sudo` yang ditampilkan PM2 dan ulangi:

```bash
pm2 save
```

## 10. Nginx dan HTTPS

Cek konfigurasi:

```bash
sudo nginx -t
sudo systemctl status nginx
sudo systemctl reload nginx
```

Lihat error:

```bash
sudo tail -n 100 /var/log/nginx/error.log
sudo tail -n 100 /var/log/nginx/access.log
```

Cek sertifikat:

```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

Port yang perlu terbuka di firewall VPS dan firewall provider:

```text
22/tcp   SSH
80/tcp   HTTP dan validasi SSL
443/tcp  HTTPS
```

Jangan membuka port `3000` atau `3306` ke internet.

## 11. Troubleshooting cepat

### Website 502 Bad Gateway

```bash
pm2 status
pm2 logs pmi-event --lines 100
curl http://127.0.0.1:3000
sudo nginx -t
```

Jika `curl` gagal, masalah ada di Next.js/PM2. Jika `curl` berhasil tetapi domain 502, masalah biasanya ada di konfigurasi Nginx.

### Website tidak bisa dibuka

```bash
sudo ufw status
sudo ss -tulpn
nslookup pmi-cianjur.com
```

Pastikan firewall provider juga mengizinkan `80` dan `443`, bukan hanya UFW di dalam VPS.

### Upload gagal

```bash
ls -ld storage storage/uploads
sudo chown -R deploy:deploy /home/deploy/pmi-event-app/storage
chmod -R 750 /home/deploy/pmi-event-app/storage
```

### Migration gagal

```bash
npx prisma migrate status
mysql -u pmi_app -p -h 127.0.0.1 pmi_event
```

Jangan langsung menggunakan `migrate reset`. Simpan pesan error terlebih dahulu dan periksa migration yang gagal.

### Error `JWT_SECRET` saat aplikasi start

Pastikan `.env` production berada di root project dan memiliki secret yang bukan secret development:

```bash
cd /home/deploy/pmi-event-app
grep -E '^(NODE_ENV|NEXT_PUBLIC_BASE_URL|JWT_SECRET|SUSULAN_JWT_SECRET)=' .env
pm2 restart pmi-event
```

Jangan menampilkan nilai secret saat meminta bantuan; cukup tampilkan nama variable dan pesan error.

## 12. Checklist sebelum setiap release

- [ ] Perubahan diuji di komputer development.
- [ ] `npm run build` berhasil.
- [ ] Migration baru sudah dibuat dan direview.
- [ ] Tidak ada `.env`, password, token, atau backup yang ikut di-commit.
- [ ] Backup database production sudah dibuat.
- [ ] Backup `storage/uploads` sudah dibuat.
- [ ] Ada rencana rollback.
- [ ] Perubahan di-pull ke VPS menggunakan `git pull --ff-only`.
- [ ] `npm ci` selesai tanpa error.
- [ ] `npx prisma migrate deploy` selesai tanpa error.
- [ ] `npm run build` di VPS selesai tanpa error.
- [ ] PM2 direstart dan statusnya `online`.
- [ ] Login, upload, download, dan fitur utama sudah diuji.

## 13. Rollback aplikasi

Jika release baru bermasalah pada kode aplikasi:

```bash
cd /home/deploy/pmi-event-app
git log --oneline -5
git checkout COMMIT_SEBELUMNYA
npm ci
npm run build
pm2 restart pmi-event
```

Jangan melakukan rollback schema database secara manual tanpa memahami migration yang sudah berjalan. Untuk migration yang sudah diterapkan, simpan backup database dan lakukan analisis sebelum membuat migration kompensasi.

## 14. Upgrade dependency

Jangan menjalankan upgrade besar langsung di production. Lakukan di development:

```bash
npm outdated
npm audit
```

Setelah perubahan dependency diuji dan `package-lock.json` berubah:

```bash
git add package.json package-lock.json
git commit -m "Perbarui dependency"
```

Deploy ke VPS melalui prosedur update standar. Untuk upgrade Next.js, Prisma, Node.js, atau React, baca changelog versi target dan lakukan backup terlebih dahulu.

## 15. Referensi resmi

- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Next.js CLI dan `next start`](https://nextjs.org/docs/app/api-reference/cli/next)
- [Prisma migrate deploy](https://www.prisma.io/docs/cli/migrate/deploy)
- [Prisma workflow development/production](https://docs.prisma.io/docs/orm/v6/prisma-migrate/workflows/development-and-production)
- [Certbot dengan Nginx](https://certbot.eff.org/instructions?os=ubuntufocal&ws=nginx)
