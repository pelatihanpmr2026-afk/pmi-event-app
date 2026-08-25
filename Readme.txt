
saya ada masalah yang harus dipecahkan bagaimana pendekatannya, jika user mendaftar pada tanggal 1 lalu ternyata ada peserta dan pendamping susulan dan ingin mendaftarkan lagi peserta dan pendamping susulan tersebut di kemudian hari, selain itu kendalanya juga ada di no peserta, no peserta ini harusnya tidak lagi melanjutkan no peserta yang bukan susulan atau yang sudah mendaftar tanggal 1, melainkan melanjutkan no peserta yang tersedia. coba pecahkan masalah tersebut.

Saya sudah bedah project-nya (Next.js + Prisma, MySQL). Ketemu akar masalahnya di dua tempat, dan keduanya saling terkait. Ini analisisnya:

Masalah 1: Sistem memang belum punya jalur "susulan"

Di src/app/api/sekolah/route.ts (endpoint pendaftaran), ada guard ini:

js
if (existingSekolah && existingSekolah.peserta.length > 0) {
  return NextResponse.json(
    { success: false, message: `"${namaLengkap}" sudah terdaftar. Silakan kembali ke Step 1.` },
    { status: 409 }
  )
}

Begitu sebuah sekolah punya minimal 1 peserta (artinya sudah pernah daftar), endpoint ini menolak total submit berikutnya. Tidak ada cara resmi untuk "nambah" peserta/pendamping ke sekolah yang sudah terdaftar.

Ini diperparah oleh constraint di schema:

prisma
model Pembayaran {
  ...
  @@unique([sekolahId, tipe])
}

Satu sekolah hanya boleh punya 1 baris Pembayaran per tipe (PESERTA/TENDA) selama-lamanya. Bahkan kalau guard 409 di atas dilepas, endpoint yang sama pakai upsert ke pembayaran — itu artinya submit susulan akan menimpa record pembayaran tanggal 1 (histori bukti transfer, kwitansi, tanggal bayar hilang), bukan menambah baris baru.

Jadi kalau sekarang ada peserta susulan, kemungkinan besar admin menambahkannya manual (lewat seed/SQL langsung), di luar jalur resmi assignNoPesertaForSekolah. Itulah yang bikin masalah kedua muncul.

Masalah 2: Penomoran (no-peserta.ts)
js
async function findNextSequence(kategori) {
  const existing = await prisma.peserta.findMany({ where: { noPeserta: { endsWith: suffix } } })
  let max = 0
  for (const p of existing) { ... if (num > max) max = num }
  return max + 1
}

Logikanya sebenarnya sudah "max+1 dari nomor yang benar-benar terpakai" — dan ini dipanggil ulang tiap iterasi di assignNoPesertaForSekolah, jadi secara desain dia akan selalu lanjut dari nomor tersedia yang sebenarnya (bukan angka statis lama), selama semua peserta yang pernah dapat nomor lewat jalur ini juga tercatat lewat jalur ini. Masalahnya muncul kalau peserta susulan dimasukkan lewat jalur lain (manual/seed) tanpa lewat assignNoPesertaForSekolah — nomor yang dipakai jadi tidak konsisten dengan apa yang dianggap "max" oleh sistem, sehingga nomor berikutnya bisa salah lanjut atau bahkan bentrok.

Catatan tambahan: ada dua file duplikat — no-peserta.ts (dipakai) dan peserta-numbering.ts (tidak dipakai di mana pun, dead code) dengan format nomor yang sedikit berbeda. Ini bahaya untuk maintenance ke depan — sebaiknya peserta-numbering.ts dihapus supaya tidak ada dev lain yang salah pakai.

Ran a command
Ran a command
Rancangan solusi

Prinsip: jangan buat sekolah "baru" untuk susulan (nama sekolah unik, akan tabrakan). Tetap satu Sekolah, tapi izinkan batch pendaftaran ke-2, ke-3, dst ditumpuk di atasnya — dengan jejak audit yang jelas (kapan, siapa peserta batch berapa) dan pembayaran terpisah per batch.

A. Perubahan schema (prisma/schema.prisma)
prisma
model Peserta {
  id           String   @id @default(cuid())
  sekolahId    String
  tipe         TipePeserta
  noPeserta    String?  @unique

  batchKe      Int      @default(1)   // 1 = pendaftaran awal, 2+ = susulan
  ...
}

model Pembayaran {
  id                String           @id @default(cuid())
  sekolahId         String
  tipe              TipePembayaran
  batchKe           Int              @default(1)   // <-- baru
  ...
  @@unique([sekolahId, tipe, batchKe])   // ganti dari @@unique([sekolahId, tipe])
}

Ini yang membongkar akar masalah #1: sekarang satu sekolah bisa punya banyak baris Pembayaran untuk tipe PESERTA (batch 1, batch 2, ...), masing-masing dengan bukti transfer, kwitansi, dan status konfirmasi sendiri — histori tanggal 1 tidak akan tertimpa lagi.

B. Endpoint baru: POST /api/sekolah/[id]/susulan

Alih-alih menambal endpoint pendaftaran awal (yang penuh asumsi "sekolah baru"), buat endpoint khusus agar logikanya tidak saling mengganggu:

js
// src/app/api/sekolah/[id]/susulan/route.ts
export async function POST(req, { params }) {
  const { id } = await params
  const sekolah = await prisma.sekolah.findUnique({ where: { id } })
  if (!sekolah) return NextResponse.json({ success: false, message: 'Sekolah tidak ditemukan' }, { status: 404 })

  // tentukan batch berikutnya berdasarkan histori pembayaran PESERTA sekolah ini
  const lastBatch = await prisma.pembayaran.findFirst({
    where: { sekolahId: id, tipe: 'PESERTA' },
    orderBy: { batchKe: 'desc' },
    select: { batchKe: true },
  })
  const batchKe = (lastBatch?.batchKe ?? 0) + 1

  // ... validasi peserta/pendamping baru (reuse pesertaMetaArraySchema/pendampingArraySchema)

  await prisma.peserta.createMany({
    data: [...pesertaBaru.map(p => ({ ...p, sekolahId: id, tipe: 'PESERTA', batchKe })),
           ...pendampingBaru.map(p => ({ ...p, sekolahId: id, tipe: 'PENDAMPING', batchKe }))],
  })

  await prisma.pembayaran.create({
    data: { sekolahId: id, tipe: 'PESERTA', batchKe, jumlahBiaya: totalBiaya, statusPembayaran: 'MENUNGGU_KONFIRMASI', buktiTransferUrl, ... },
  })
}

Karena ini create baru (bukan upsert), tidak akan pernah menimpa batch sebelumnya. Alur konfirmasi admin (/api/pembayaran/[id]/konfirmasi) tidak perlu diubah — dia sudah bekerja per-Pembayaran.id, jadi otomatis bisa mengonfirmasi batch susulan secara independen dari batch awal.

C. Penomoran otomatis benar dengan sendirinya

Karena assignNoPesertaForSekolah sudah memfilter noPeserta: null dan menghitung max secara live dari seluruh Peserta (lintas sekolah, lintas batch) setiap kali dipanggil, begitu alur susulan resmi di atas dipakai (bukan insert manual), nomor peserta susulan otomatis melanjutkan nomor yang benar-benar tersedia — bukan mengulang dari 1, dan tidak akan bentrok dengan peserta tanggal 1. Tidak perlu logic numbering baru, itu murni gejala dari akar masalah #1.

Yang perlu ditambahkan hanya pengaman race-condition, karena findNextSequence → cek klaim noPeserta dilakukan di luar transaksi. Kalau dua batch susulan dikonfirmasi nyaris bersamaan, bisa saling salip. Solusi murah: bungkus generateNoPeserta + update dalam prisma.$transaction dengan isolation level serializable, atau pakai tabel counter kecil (SekolahKategoriCounter) yang di-increment atomik.

D. Bersih-bersih

src/lib/peserta-numbering.ts tidak dipakai di manapun — hapus supaya tidak membingungkan dev lain di kemudian hari.

   Ini rancangan UI-nya:

1. Titik masuk: pesan "sudah terdaftar" diubah jadi ajakan susulan

Saat ini di step-data-sekolah.tsx, kalau nama sekolah dicek dan hasilnya terpakai_lengkap, formulir cuma menampilkan ikon X merah — dead end, pembina harus WA panitia manual. Titik ini pas sekali dijadikan pintu masuk susulan:

Sebelum: "❌ Sekolah sudah terdaftar"
Sesudah: "❌ Sekolah sudah terdaftar → [Daftarkan Peserta/Pendamping Susulan]"

Tombol ini mengarah ke halaman baru, misalnya /sekolah/susulan?nama=..., bukan lanjut ke Step 2 form yang sama — karena data sekolah (jenjang, status, kategori) tidak perlu diinput ulang, cuma perlu identitas peserta baru.

2. Verifikasi kepemilikan (penting!)

Karena ini form publik, tidak boleh sembarang orang bisa "menambah peserta susulan" ke sekolah lain hanya dengan tahu namanya. Perlu 1 layar verifikasi ringan sebelum masuk ke form susulan:

Input: Kode Pendaftaran (yang sudah mereka terima via kwitansi/excel saat daftar tanggal 1) + No. WhatsApp Pembina yang terdaftar.
Endpoint GET /api/sekolah/susulan/verify?kode=...&noWa=... mencocokkan ke Sekolah.kodePendaftaran + noWhatsappPembina. Kalau cocok → dapat sekolahId, lanjut ke form.

Ini reuse pola yang sudah ada (mirip daftar-ulang/scan yang verifikasi via token), jadi tidak asing dari sisi arsitektur.

3. Form susulan — reuse komponen, bukan flow baru

Form-nya tidak perlu 5 step ulang. Cukup 3 layar, reuse langsung dari step yang sudah ada:

Layar	Komponen	Catatan
1. Data peserta susulan	StepPeserta (sudah ada)	Reuse apa adanya — cuma daftar peserta baru, tidak perlu ulangi data sekolah
2. Data pendamping susulan	StepPendamping (sudah ada)	Boleh 0 pendamping (kalau susulan cuma peserta)
3. Review + Upload bukti transfer	StepReviewKonfirmasi + StepFinalPayment	Perlu sedikit modifikasi: total biaya dihitung ulang (hanya peserta/pendamping baru), dan submit ke endpoint baru POST /api/sekolah/[id]/susulan bukan POST /api/sekolah

Yang ditampilkan tambahan di layar review: ringkasan "Batch sebelumnya: 12 peserta (LUNAS) → Susulan ini: +3 peserta" — supaya pembina sadar ini nambah, bukan menggantikan.

4. Halaman status setelah submit susulan

Redirect ke /sekolah/pembayaran/[id] yang sudah ada — tapi karena sekarang bisa ada >1 Pembayaran bertipe PESERTA per sekolah, komponen UploadBuktiTransfer/status perlu tahu batch mana yang sedang ditunggu konfirmasinya (pakai pembayaranId, bukan cuma sekolahId).

5. Sisi admin (sekolah-detail-modal.tsx)

Ini yang paling perlu diubah karena sekarang asumsinya 1 sekolah = 1 baris pembayaran PESERTA:

const pembayaranPeserta = data?.pembayaran.find((p) => p.tipe === 'PESERTA')

Diubah jadi list, dirender sebagai kartu bertumpuk per batch:

📋 Batch 1 — LUNAS (dikonfirmasi 1 Agu)         [detail bukti/kwitansi]
📋 Batch 2 (Susulan) — MENUNGGU KONFIRMASI       [Terima] [Tolak]

masing-masing tetap pakai KonfirmasiPembayaranPanel yang sudah ada, cuma di-loop per pembayaran. Lalu di tabel Peserta/Pendamping, tambah kolom kecil badge "Batch 1" / "Susulan #2" (dari field batchKe) supaya panitia bisa lihat riwayat siapa yang daftar duluan vs susulan — berguna juga untuk audit no. peserta