import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/api-guard'
import { RESUME_LINK_TTL_MS } from '@/app/api/draft/route'

// Menerbitkan/me-refresh token resume untuk draft lama yang belum punya
// resumeToken (dibuat sebelum migrasi resume-token). Dipakai tombol "Salin
// Link" di dashboard draft — setiap klik membuat link baru & menonaktifkan
// link sebelumnya (anti-hijack bila link bocor).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin()
    if (!guard.ok) return guard.response

    const { id } = await params
    const draft = await prisma.draft.findUnique({ where: { id } })
    if (!draft) {
      return NextResponse.json({ success: false, message: 'Draft tidak ditemukan' }, { status: 404 })
    }

    const resumeToken = randomUUID()
    const resumeTokenExpiresAt = new Date(Date.now() + RESUME_LINK_TTL_MS)

    await prisma.draft.update({
      where: { id },
      data: { resumeToken, resumeTokenExpiresAt },
    })

    return NextResponse.json({
      success: true,
      data: {
        draftId: id,
        resumeToken,
        resumeTokenExpiresAt: resumeTokenExpiresAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[POST /api/draft/:id/resume-link]', error)
    return NextResponse.json({ success: false, message: 'Gagal membuat link draft' }, { status: 500 })
  }
}