import { prisma } from './prisma'
import type { AdminRoleType } from './admin-role'
import { headers } from 'next/headers'
import { Prisma } from '@prisma/client' // <--- TAMBAHKAN IMPORT INI

export async function logAdminAction(
  adminId: string | null,
  adminName: string,
  adminRole: AdminRoleType | null,
  action: string,
  options: {
    targetType?: string
    targetId?: string
    metadata?: Record<string, unknown>
    ip?: string | null
    userAgent?: string | null
  } = {}
) {
  try {
    // Ambil IP & User-Agent dari request headers jika tidak dikirim manual
    let ip = options.ip
    let userAgent = options.userAgent

    const headersList = await headers()
    if (!ip) {
      ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || null
    }
    if (!userAgent) {
      userAgent = headersList.get('user-agent') || null
    }

    await prisma.adminLog.create({
      data: {
        adminId,
        adminName,
        adminRole,
        action,
        targetType: options.targetType,
        targetId: options.targetId,
        // FIX: Lakukan cast ke Prisma.InputJsonValue agar TypeScript tidak error
        metadata: options.metadata as Prisma.InputJsonValue, 
        ip,
        userAgent,
      },
    })
  } catch (error) {
    // Jangan sampai gagal log menggagalkan operasi utama aplikasi
    console.error('Gagal mencatat admin log:', error)
  }
}