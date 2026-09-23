/**
 * Pencarian sekolah client-side — murni tanpa dependensi server (jangan
 * import prisma/lib server di sini agar aman di-bundle ke browser).
 *
 * Menyetarakan varian penulisan ("SMPN"/"SMP N"/"SMP NEGERI"/"SMAS" → SMP),
 * toleran salah ketik 1–2 huruf, dan me-ranking hasil paling relevan dulu.
 *
 * Catatan: duplikasi logic namaSekolahKey dari src/lib/sekolah.ts disengaja —
 * versi server dipakai untuk deteksi duplikat pendaftaran (aturan lebih ketat:
 * SMAN 1 vs SMAS 1 dianggap beda), sedangkan di sini aturan lebih longgar
 * agar pencarian semudah mungkin.
 */

export interface SekolahCari {
  id: string
  namaSekolah: string
  kategori: string
  jumlahPembina: number
}

const TOKEN_ABAIKAN = new Set(['NEGERI', 'N', 'SWASTA', 'NEG', 'SWT'])

function kunciDasar(nama: string): string {
  return nama
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .replace(/\b(SMP|SMA|SMK|MTS|MA)\s+(?:NEGERI|N)\b/g, '$1')
    .replace(/\b(SMP|SMA|SMK|MTS|MA)N\b/g, '$1')
    .replace(/\b(SMP|SMA|SMK|MTS|MA)S\b/g, '$1')
}

function tokenKunci(nama: string): string[] {
  const token = kunciDasar(nama)
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !TOKEN_ABAIKAN.has(t))
  // Kembangkan singkatan agar "mtsn 2" ketemu "MADRASAH TSANAWIYAH NEGERI 2"
  // (berlaku simetris di query & data, jadi varian tulis apa pun tetap cocok).
  return token.flatMap((t) => {
    if (t === 'MTS') return ['MADRASAH', 'TSANAWIYAH']
    if (t === 'MA') return ['MADRASAH', 'ALIYAH']
    return [t]
  })
}

function jarakEdit(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    let cur0 = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const next = Math.min(prev[j] + 1, cur0 + 1, prev[j - 1] + cost)
      prev[j - 1] = cur0
      cur0 = next
    }
    prev[n] = cur0
  }
  return prev[n]
}

const ANGKA = /^\d+$/

/**
 * Skor kecocokan query→sekolah. null = tidak cocok.
 * Lebih kecil = lebih relevan (0 = semua token cocok persis).
 */
function skor(queryToken: string[], sekolahToken: string[]): number | null {
  let total = 0
  for (const q of queryToken) {
    if (sekolahToken.includes(q)) continue // cocok persis
    // Token angka harus persis ("1" tidak boleh cocok "10")
    if (ANGKA.test(q)) return null
    // Awalan ("sm" cocok "SMP"/"SMA") — hanya untuk token huruf ≥2 huruf
    if (q.length >= 2 && sekolahToken.some((t) => !ANGKA.test(t) && (t.startsWith(q) || q.startsWith(t)))) {
      total += 1
      continue
    }
    // Salah ketik: hanya untuk token ≥4 huruf ("SMP" tidak boleh cocok "SMA").
    // Toleransi 1 huruf (≤6 huruf) / 2 huruf (>6 huruf).
    if (q.length < 4) return null
    const batas = q.length <= 6 ? 1 : 2
    const d = Math.min(...sekolahToken.filter((t) => !ANGKA.test(t)).map((t) => jarakEdit(q, t)))
    if (d <= batas) {
      total += 2 + d
      continue
    }
    return null
  }
  return total
}

export interface HasilCari extends SekolahCari {
  skor: number
}

/** Saring + ranking daftar sekolah. Query kosong → seluruh daftar (terurut nama). */
export function cariSekolah(query: string, daftar: SekolahCari[]): HasilCari[] {
  const q = query.trim()
  if (!q) return daftar.map((s) => ({ ...s, skor: 0 }))
  const tokenQuery = tokenKunci(q)
  if (tokenQuery.length === 0) return daftar.map((s) => ({ ...s, skor: 0 }))

  const hasil: HasilCari[] = []
  for (const s of daftar) {
    const nilai = skor(tokenQuery, tokenKunci(s.namaSekolah))
    if (nilai !== null) hasil.push({ ...s, skor: nilai })
  }
  hasil.sort((a, b) => a.skor - b.skor || a.namaSekolah.localeCompare(b.namaSekolah, 'id'))
  return hasil
}
