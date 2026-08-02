# 1. Backup dulu (WAJIB sebelum migrasi apapun ke production)
mysqldump -u root pmi_event_db > backup_sebelum_update.sql
xcopy storage\uploads C:\Backup\uploads-sebelum-update /E /I /Y

# 2. Copy file kode yang baru dari folder -dev ke folder production
#    (kalau pakai Git, ini cukup `git pull` — sangat disarankan, lihat catatan di bawah)

# 3. Install dependency baru kalau ada yang ditambahkan
npm install

# 4. Apply migrasi database — PENTING: pakai "migrate deploy", BUKAN "migrate dev"
npx prisma migrate deploy

# 5. Build ulang
npm run build

# 6. Restart PM2
pm2 restart pmi-event

Poin paling kritis: di production, selalu pakai npx prisma migrate deploy, jangan pernah npx prisma migrate dev. migrate dev bisa mendeteksi "drift" antara schema dan history migrasi lalu menawarkan reset database — kalau ini kejadian di database production tanpa sadar, semua data pendaftaran panitia yang sudah masuk bisa hilang. migrate deploy didesain khusus aman untuk production: dia cuma apply migrasi baru yang belum pernah dijalankan, tidak pernah reset apapun.