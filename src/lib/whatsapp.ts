import { getBaseUrl } from './get-base-url'
import { DIVISI_OPTIONS } from './constants'

/** Label divisi yang user-friendly, mis. enum PERALATAN → "Divisi Peralatan". */
export function labelDivisi(value: string): string {
  const label = DIVISI_OPTIONS.find((d) => d.value === value)?.label ?? value
  return label.toLowerCase().startsWith('divisi') ? label : `Divisi ${label}`
}

/**
 * Pengiriman notifikasi WhatsApp via Meta Cloud API (resmi, gratis per pesan).
 *
 * Mode dikendalikan env `WA_META_TOKEN`:
 * - Tanpa token → DRY-RUN: pesan TIDAK dikirim, hanya dicatat di console. Alur
 *   aplikasi tetap berjalan dan hasil tercatat di admin log, sehingga bisa
 *   dites sebelum akun WhatsApp Business dikonfigurasi.
 * - Dengan token → kirim sungguhan ke Graph API.
 *
 * Aturan Meta untuk pesan yang diinisiasi bisnis (outbound): WAJIB memakai
 * template yang sudah disetujui, kecuali masih dalam jendela 24 jam sejak
 * pengguna terakhir chat. Karena alur ini selalu outbound, set
 * `WA_META_USE_TEMPLATE=true` dan buat template berikut di WhatsApp Manager:
 *
 * 1) `pengajuan_disetujui` — header type DOCUMENT + body 1 variabel:
 *    Body: "Pengajuan anggaran {{1}} telah DISETUJUI. Dokumen PDF terlampir."
 * 2) `pengajuan_ditolak` — body 2 variabel:
 *    Body: "Pengajuan anggaran {{1}} DITOLAK. Alasan: {{2}}. Silakan perbaiki
 *    atau hubungi divisi keuangan."
 */

const GRAPH_VERSION = 'v20.0'

export interface KirimHasil {
  ok: boolean
  dryRun: boolean
  detail: string
}

function metaConfig() {
  const token = process.env.WA_META_TOKEN
  const phoneNumberId = process.env.WA_META_PHONE_NUMBER_ID
  const sender = process.env.WA_SENDER_NUMBER || ''
  return { token, phoneNumberId, sender }
}

/** Ubah nomor lokal (08xx / 628xx / +62) menjadi format internasional tanpa + (628...) */
export function toInternational(number: string): string {
  const digits = number.replace(/\D/g, '')
  if (digits.startsWith('628')) return digits
  if (digits.startsWith('8')) return `62${digits}`
  return `62${digits.replace(/^0/, '')}`
}

async function dryRun(
  tujuan: string,
  type: 'text' | 'document' | 'template',
  payload: unknown
): Promise<KirimHasil> {
  const { sender } = metaConfig()
  console.log(
    `[whatsapp:dry-run] Kirim ke ${toInternational(tujuan)} (pengirim: ${sender || 'belum diatur'}):`,
    JSON.stringify({ type, ...(payload as object) }, null, 2)
  )
  return { ok: true, dryRun: true, detail: 'Dry-run (token belum dikonfigurasi) — pesan tidak dikirim' }
}

async function callGraph<T>(path: string, init: RequestInit): Promise<T> {
  const { token } = metaConfig()
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...(init.headers as Record<string, string>),
    },
  })
  const data = (await res.json()) as T & { error?: { message?: string } }
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Meta Graph API gagal (${res.status})`)
  }
  return data
}

/** Kirim template teks (pesan bisnis outbound yang diinisiasi bisnis). */
export async function kirimTemplateTeksWhatsApp(opts: {
  tujuan: string
  namaTemplate: string
  params: string[]
}): Promise<KirimHasil> {
  const { tujuan, namaTemplate, params } = opts
  const { token, phoneNumberId } = metaConfig()
  if (!token) return dryRun(tujuan, 'template', { namaTemplate, params })

  await callGraph(`${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toInternational(tujuan),
      type: 'template',
      template: {
        name: namaTemplate,
        language: { code: 'id' },
        components: [
          { type: 'body', parameters: params.map((text) => ({ type: 'text', text })) },
        ],
      },
    }),
  })
  return { ok: true, dryRun: false, detail: `Template "${namaTemplate}" terkirim via Meta Cloud API` }
}

/** Kirim template dengan header dokumen (PDF) — untuk notifikasi disetujui. */
export async function kirimTemplateDokumenWhatsApp(opts: {
  tujuan: string
  namaTemplate: string
  pdfLink?: string
  pdfMediaId?: string
  filename: string
  bodyParams: string[]
}): Promise<KirimHasil> {
  const { tujuan, namaTemplate, pdfLink, pdfMediaId, filename, bodyParams } = opts
  const { token, phoneNumberId } = metaConfig()
  if (!token) return dryRun(tujuan, 'template', { namaTemplate, pdfLink, pdfMediaId, filename, bodyParams })

  if (!pdfLink && !pdfMediaId) {
    return { ok: false, dryRun: false, detail: 'Tidak ada PDF (link/media id kosong)' }
  }

  const document = pdfMediaId ? { id: pdfMediaId, filename } : { link: pdfLink as string, filename }

  await callGraph(`${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toInternational(tujuan),
      type: 'template',
      template: {
        name: namaTemplate,
        language: { code: 'id' },
        components: [
          {
            type: 'header',
            parameters: [{ type: 'document', document }],
          },
          { type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) },
        ],
      },
    }),
  })
  return { ok: true, dryRun: false, detail: `Template "${namaTemplate}" (PDF) terkirim via Meta Cloud API` }
}

/**
 * Kirim notifikasi pengajuan DISETUJUI.
 * Prioritas: template dengan header dokumen (patuh aturan outbound Meta).
 * Fallback: media message biasa (hanya berlaku dalam jendela 24 jam).
 */
export async function kirimNotifDisetujui(opts: {
  tujuan: string
  nomorPengajuan: string
  divisi: string
  pdfBuffer?: Buffer
  pdfUrl?: string
}): Promise<KirimHasil> {
  const { tujuan, nomorPengajuan, divisi, pdfBuffer, pdfUrl } = opts
  const filename = `${nomorPengajuan.replace(/\s+/g, '_')}.pdf`

  if (process.env.WA_META_USE_TEMPLATE === 'true') {
    const namaTemplate = process.env.WA_TEMPLATE_DISETUJUI || 'pengajuan_disetujui'

    // Upload PDF via /media dulu untuk mendapat media id — Meta mendukung
    // media id di header template dokumen, tanpa perlu link publik.
    let pdfMediaId: string | undefined
    if (pdfBuffer && pdfBuffer.length > 0) {
      const form = new FormData()
      form.append('messaging_product', 'whatsapp')
      form.append('file', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), filename)
      const uploaded = await callGraph<{ id?: string }>(`${process.env.WA_META_PHONE_NUMBER_ID}/media`, {
        method: 'POST',
        body: form,
      })
      pdfMediaId = uploaded.id
    }

    const pdfLink = pdfUrl ? `${getBaseUrl()}${pdfUrl}` : undefined

    if (pdfMediaId || pdfLink) {
      return kirimTemplateDokumenWhatsApp({
        tujuan,
        namaTemplate,
        pdfLink,
        pdfMediaId,
        filename,
        bodyParams: [labelDivisi(divisi)],
      })
    }

    // Tanpa PDF, kirim template teks pemberitahuan saja.
    return kirimTemplateTeksWhatsApp({
      tujuan,
      namaTemplate,
      params: [labelDivisi(divisi)],
    })
  }

  // Mode tanpa template: kirim media message (berlaku dalam jendela 24 jam).
  const { token, phoneNumberId } = metaConfig()
  if (!token) return dryRun(tujuan, 'document', { filename, pdfUrl })

  let mediaId: string | undefined
  let link: string | undefined

  if (pdfBuffer && pdfBuffer.length > 0) {
    const form = new FormData()
    form.append('messaging_product', 'whatsapp')
    form.append('file', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), filename)
    const uploaded = await callGraph<{ id?: string }>(`${phoneNumberId}/media`, {
      method: 'POST',
      body: form,
    })
    mediaId = uploaded.id
  } else if (pdfUrl) {
    link = `${getBaseUrl()}${pdfUrl}`
  }

  if (!mediaId && !link) {
    return { ok: false, dryRun: false, detail: 'Tidak ada PDF (buffer/link kosong)' }
  }

  const document = mediaId ? { id: mediaId, filename } : { link: link as string, filename }

  await callGraph(`${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: toInternational(tujuan), type: 'document', document }),
  })
  return { ok: true, dryRun: false, detail: 'PDF terkirim via Meta Cloud API (media message)' }
}

/** Kirim notifikasi pengajuan DITOLAK: template teks dengan alasan penolakan. */
export async function kirimNotifDitolak(opts: {
  tujuan: string
  divisi: string
  alasan: string
}): Promise<KirimHasil> {
  const { tujuan, divisi, alasan } = opts

  if (process.env.WA_META_USE_TEMPLATE === 'true') {
    const namaTemplate = process.env.WA_TEMPLATE_DITOLAK || 'pengajuan_ditolak'
    return kirimTemplateTeksWhatsApp({
      tujuan,
      namaTemplate,
      params: [labelDivisi(divisi), alasan || '-'],
    })
  }

  const body = `Pengajuan ${labelDivisi(divisi)} DITOLAK.\nAlasan: ${alasan || 'Tidak ada keterangan.'}\n\nSilakan perbaiki atau hubungi divisi keuangan.`
  const { token, phoneNumberId } = metaConfig()
  if (!token) return dryRun(tujuan, 'text', { body })

  await callGraph(`${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toInternational(tujuan),
      type: 'text',
      text: { body },
    }),
  })
  return { ok: true, dryRun: false, detail: 'Teks terkirim via Meta Cloud API (media bebas, berlaku dalam jendela 24 jam)' }
}