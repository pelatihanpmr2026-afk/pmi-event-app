# Panduan Setup dan Maintenance PMI Event App

Dokumen ini menjelaskan cara membuka project di laptop baru, menjalankan aplikasi, mengedit kode, menguji perubahan, dan mengirim perubahan ke repository.

## 1. Teknologi dan alamat

- Next.js 16, React 19, TypeScript
- Prisma 6 dan MySQL
- Tailwind CSS
- pdf-lib, sharp, dan @napi-rs/canvas
- Development: http://localhost:3001
- Production: https://pmi-cianjur.com
- Port production internal di VPS: 3000
- Port publik melalui Nginx: 80 dan 443

## 2. Software yang diperlukan

Install:

1. Git
2. Node.js LTS minimal versi 20.9, 64-bit
3. Laragon atau MySQL Server
4. Visual Studio Code
5. 7-Zip, opsional untuk membuka backup

Cek instalasi dari PowerShell:

~~~powershell
git --version
node --version
npm --version
~~~

Gunakan Node.js versi LTS. Versi yang terlalu lama dapat menyebabkan dependency native atau build gagal.

## 3. Clone repository

Pastikan teman/developer sudah diberi akses ke repository Git.

~~~powershell
cd C:\laragon\www
git clone URL_REPOSITORY pmi-event-app
cd pmi-event-app
~~~

Ganti URL_REPOSITORY dengan URL repository sebenarnya. Untuk repository private, gunakan akun Git yang memiliki izin akses.

## 4. Install dependency

~~~powershell
npm ci
~~~

Gunakan npm ci agar versi dependency mengikuti package-lock.json. Command ini juga menjalankan prisma generate.

Jika dependency native gagal:

~~~powershell
Remove-Item -Recurse -Force node_modules
npm ci
~~~

Jangan menghapus package-lock.json.

## 5. Menyiapkan MySQL lokal

### Database kosong

1. Buka Laragon.
2. Jalankan MySQL.
3. Buat database bernama pmi_event_db.

Dengan command line:

~~~powershell
mysql -u root -p -e "CREATE DATABASE pmi_event_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
~~~

Pada Laragon standar, password root sering kosong. Jika memang kosong, tekan Enter ketika diminta password.

Buat tabel dan data awal:

~~~powershell
npx prisma migrate deploy
npx prisma db seed
~~~

Jangan menjalankan npx prisma migrate reset pada database berisi data penting.

### Database dari backup

Jika membutuhkan data sekolah, peserta, panitia, pembayaran, atau pengajuan anggaran, minta backup SQL dari pemilik project.

Buat database kosong dahulu, lalu import:

~~~powershell
mysql -u root -p pmi_event_db < C:\Users\NAMA_USER\Downloads\pmi_event.sql
~~~

Jika backup berupa .gz, ekstrak dengan 7-Zip terlebih dahulu.

Setelah import:

~~~powershell
npx prisma generate
npx prisma migrate status
~~~

Jangan menjalankan migration secara sembarangan sebelum memeriksa hasil migrate status.

## 6. Konfigurasi .env

Buat file .env dari contoh:

~~~powershell
Copy-Item .env.example .env
~~~

Isi minimal untuk development:

~~~env
NODE_ENV=development
DATABASE_URL="mysql://root:@127.0.0.1:3306/pmi_event_db"
NEXT_PUBLIC_BASE_URL="http://localhost:3001"

JWT_SECRET="secret-development-acak-panjang"
SUSULAN_JWT_SECRET="secret-development-susulan-acak"
CRON_SECRET="secret-development-cron-acak"

ADMIN_INITIAL_USERNAME="admin"
ADMIN_INITIAL_PASSWORD="password-development-kuat"
KTA_INITIAL_USERNAME="kta"
KTA_INITIAL_PASSWORD="password-kta-development-kuat"
~~~

Jika MySQL memiliki password:

~~~env
DATABASE_URL="mysql://root:PASSWORD_MYSQL@127.0.0.1:3306/pmi_event_db"
~~~

Password dengan karakter seperti @, #, atau / harus di-URL-encode. File .env berisi rahasia dan tidak boleh di-commit.

## 7. Menyalin folder uploads

Folder upload tidak disimpan di Git. Jika ada backup uploads, salin seluruh isinya ke:

~~~text
C:\laragon\www\pmi-event-app\storage\uploads
~~~

Struktur umumnya:

~~~text
storage/uploads/
├── bukti-transfer/
├── excel/
├── idcards/
├── kwitansi/
├── peserta-photos/
├── pengajuan/
├── photos/
├── qrcodes/
├── surat-pernyataan/
├── tanda-tangan/
└── tenda/
~~~

Jika hanya ingin menjalankan project tanpa file lama:

~~~powershell
New-Item -ItemType Directory -Force storage\uploads | Out-Null
~~~

Database dan uploads harus dipindahkan bersama. URL seperti /uploads/photos/nama.jpg membutuhkan file fisik pada storage/uploads/photos/nama.jpg.

## 8. Menjalankan aplikasi

~~~powershell
npm run dev
~~~

Buka http://localhost:3001. Port development adalah 3001, bukan 3000. Setelah mengubah .env, restart server.

## 9. Role pengguna

- SUPERADMIN: akses penuh.
- KESEKRETARIATAN: pendaftaran, peserta, panitia, absensi, dan administrasi.
- KEUANGAN: keuangan dan pengajuan anggaran.
- ACARA: akses terbatas untuk kebutuhan acara.
- KTA: daftar sekolah dan generate KTA peserta.

Fitur KTA ada di Dashboard → Sekolah pada akun role KTA, lalu pilih Download KTA PDF. Satu file berisi seluruh peserta sekolah tersebut, dengan halaman depan dan belakang setiap peserta.

## 10. Struktur folder penting

~~~text
src/app/                         Halaman Next.js dan API
src/app/api/                     Endpoint API
src/components/                  Komponen UI
src/lib/                         Logika bisnis dan generator file
prisma/schema.prisma             Struktur database
prisma/migrations/               Riwayat migration
prisma/seed.ts                   Data awal dan akun seed
public/assets/                   Template dan asset statis
storage/uploads/                 File runtime, tidak disimpan Git
ecosystem.config.js              Konfigurasi PM2 production
next.config.ts                   Konfigurasi Next.js
OPERATIONS.md                    Panduan operasional VPS
~~~

Template KTA:

~~~text
public/assets/template_kta_front.png
public/assets/template-kta-back.png
~~~

## 11. Alur mengedit kode

Periksa status sebelum mengedit:

~~~powershell
git status
git branch --show-current
~~~

Buat branch perubahan:

~~~powershell
git switch -c codex/nama-perubahan
~~~

Alur kerja:

1. Jalankan npm run dev.
2. Ubah file yang diperlukan.
3. Uji halaman terdampak di browser.
4. Uji login, upload, download, dan database jika terdampak.
5. Jalankan validasi sebelum commit.

Validasi minimum:

~~~powershell
npx tsc --noEmit --pretty false
npm run lint:routes
git diff --check
npm run build
~~~

## 12. Perubahan schema Prisma

Jika mengubah prisma/schema.prisma:

~~~powershell
npx prisma migrate dev --name jelaskan_perubahan
npx prisma generate
~~~

Review SQL migration, lalu commit schema dan migration bersama:

~~~powershell
git add prisma/schema.prisma prisma/migrations
git commit -m "Tambah migration jelaskan perubahan"
~~~

Di VPS hanya gunakan:

~~~bash
npx prisma migrate deploy
~~~

Jangan gunakan di production:

~~~bash
npx prisma migrate reset
npx prisma migrate dev
~~~

Jangan menghapus atau mengubah migration lama yang sudah pernah diterapkan di production.

## 13. Commit dan push

Periksa perubahan:

~~~powershell
git status
git diff
~~~

Tambahkan file yang relevan saja:

~~~powershell
git add src\folder\file.tsx src\lib\file.ts
~~~

Commit dan push:

~~~powershell
git commit -m "Jelaskan perubahan dalam satu kalimat"
git push -u origin codex/nama-perubahan
~~~

Jika tim menggunakan branch utama dan pemilik mengizinkan:

~~~powershell
git push origin main
~~~

Sebaiknya perubahan ditinjau melalui Pull Request sebelum masuk production.

## 14. Deploy ke VPS

Developer cukup melakukan push. Orang yang memiliki akses SSH menjalankan:

~~~bash
cd /home/deploy/pmi-event-app
git pull --ff-only
npm ci
npx prisma migrate deploy
npm run build
pm2 restart pmi-event --update-env
pm2 save
~~~

Verifikasi:

~~~bash
pm2 status
pm2 logs pmi-event --lines 100
curl -I http://127.0.0.1:3000
~~~

Jangan menghapus storage/uploads saat update.

## 15. Backup sebelum update besar

Di VPS:

~~~bash
mkdir -p /home/deploy/backups
mysqldump --no-tablespaces --single-transaction \
  -u pmi_app -p pmi_event \
  | gzip > /home/deploy/backups/before_update_$(date +%F_%H-%M).sql.gz
tar -czf /home/deploy/backups/uploads_before_update_$(date +%F_%H-%M).tar.gz \
  /home/deploy/pmi-event-app/storage/uploads
~~~

Salin ke Windows dari PowerShell lokal:

~~~powershell
scp deploy@IP_VPS:/home/deploy/backups/nama-file.sql.gz C:\Users\NamaUser\Downloads\
scp deploy@IP_VPS:/home/deploy/backups/nama-file.tar.gz C:\Users\NamaUser\Downloads\
~~~

## 16. Troubleshooting

### npm ci gagal

Pastikan Node.js LTS 64-bit dan internet aktif. Hapus node_modules, lalu jalankan npm ci kembali. Jangan menghapus package-lock.json.

### Prisma gagal konek

Pastikan MySQL berjalan, database ada, serta username, password, port, dan DATABASE_URL benar.

### Login atau redirect gagal

Pastikan JWT_SECRET tersedia. Hapus cookie localhost dari browser dan restart server setelah mengubah .env.

### Foto atau file tidak muncul

Pastikan database dan storage/uploads berasal dari salinan yang sama. Periksa nama file, subfolder, dan permission.

### KTA PDF gagal dibuat

Pastikan dua template ini ada dan tidak berukuran 0 byte:

~~~text
public/assets/template_kta_front.png
public/assets/template-kta-back.png
~~~

Periksa log production:

~~~bash
pm2 logs pmi-event --lines 100
~~~

### Perubahan tidak terlihat di VPS

~~~bash
git log -1 --oneline
pm2 restart pmi-event --update-env
~~~

Pastikan VPS mengambil branch dan commit yang benar.

## 17. Aturan keamanan

- Jangan commit .env.
- Jangan commit backup database.
- Jangan commit storage/uploads.
- Jangan membagikan password database, JWT secret, atau private key.
- Jangan membuka port internal 3000 ke internet.
- Backup database dan uploads sebelum migration atau update besar.
- Jangan menjalankan command penghapusan database tanpa persetujuan pemilik.

## 18. Checklist sebelum menyerahkan perubahan

- [ ] Project berjalan dengan npm run dev.
- [ ] Fitur terkait sudah diuji di browser.
- [ ] Tidak ada .env, backup database, atau uploads di commit.
- [ ] npx tsc --noEmit --pretty false berhasil.
- [ ] npm run lint:routes berhasil.
- [ ] npm run build berhasil.
- [ ] Migration sudah direview jika ada perubahan schema.
- [ ] Commit message jelas.
- [ ] Perubahan sudah di-push ke branch yang benar.
- [ ] Tim deployment diberi tahu jika ada migration atau asset baru.
