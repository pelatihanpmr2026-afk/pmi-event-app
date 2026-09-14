import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Resume draft publik via link yang dibagikan panitia ke pembina sekolah.
 * Tidak butuh login admin — akses dikunci token acak (resumeToken) yang
 * hanya muncul di halaman dashboard panitia.
 *
 * Mata rantai keamanan:
 * - token = randomUUID (tidak bisa ditebak), dicek string equality.
 * - token kedaluwarsa (resumeTokenExpiresAt < now) → 410 GONE.
 * - draft tidak ada / token tak cocok → 404 (sengaja disamarkan).
 */

interface ResumeParams {
  draft: string
  token: string | null
}

function parse(req: NextRequest): ResumeParams {
  const { searchParams } = new URL(req.url)
  return {
    draft: searchParams.get('draft') ?? '',
    token: searchParams.get('token'),
  }
}

// Cari draft + verifikasi token. Return null → route error; throw tak terjadi
// untuk kondisi yang memang dikembalikan ke klien sebagai status HTTP.
async function findVerifiedDraft({ draft, token }: ResumeParams) {
  if (!draft || !token) return { error: NextResponse.json({ success: false, message: 'Tautan tidak valid' }, { status: 400 }) } as const
  const draftRow = await prisma.draft.findUnique({ where: { id: draft } })
  if (!draftRow || !draftRow.resumeToken || draftRow.resumeToken !== token) {
    return { error: NextResponse.json({ success: false, message: 'Tautan tidak valid atau draft sudah dihapus' }, { status: 404 }) } as const
  }
  if (draftRow.resumeTokenExpiresAt && draftRow.resumeTokenExpiresAt.getTime() <= Date.now()) {
    return { error: NextResponse.json({ success: false, message: 'Tautan sudah kedaluwarsa. Hubungi panitia untuk membuat link baru.' }, { status: 410 }) } as const
  }
  return { draft: draftRow } as const
}

export async function GET(req: NextRequest) {
  try {
    const result = await findVerifiedDraft(parse(req))
    if ('error' in result) return result.error

    const draft = result.draft
    return NextResponse.json({
      success: true,
      data: {
        id: draft.id,
        namaSekolah: draft.namaSekolah,
        currentStep: draft.currentStep,
        dataSekolah: draft.dataSekolah,
        dataPeserta: draft.dataPeserta,
        dataPendamping: draft.dataPendamping,
        updatedAt: draft.updatedAt.toISOString(),
        createdAt: draft.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[GET /api/draft/public/resume]', error)
    return NextResponse.json({ success: false, message: 'Gagal memuat draft' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const result = await findVerifiedDraft(parse(req))
    if ('error' in result) return result.error

    await prisma.draft.delete({ where: { id: result.draft.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/draft/public/resume]', error)
    return NextResponse.json({ success: false, message: 'Gagal menghapus draft' }, { status: 500 })
  }
}