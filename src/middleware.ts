import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/auth'
import { isPathAllowedForRole, getDefaultPathForRole } from '@/lib/admin-role'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Aplikasi ini tidak memakai Server Action. Header ini hanya boleh ada pada
  // request yang dibuat runtime Next; ID lama/palsu akan membuat Next membalas
  // teks "Server action not found", padahal pemanggil API mengharapkan JSON.
  if (req.headers.has('next-action')) {
    return NextResponse.json(
      {
        success: false,
        message: 'Sesi aplikasi telah berubah. Muat ulang halaman lalu coba lagi.',
      },
      {
        status: 409,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  }

  // Semua form aplikasi mengirim POST ke /api. Tolak POST ke halaman biasa
  // sebelum Next mencoba memperlakukannya sebagai Server Action.
  if (req.method === 'POST' && !pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, message: 'Metode request tidak didukung' },
      { status: 405, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null

  const isLoginPage = pathname === '/login'
  const isDashboardPage = pathname.startsWith('/dashboard')

  // API memakai guard dan respons JSON masing-masing; jangan redirect fetch
  // API ke /login karena browser akan mengubahnya menjadi POST ke halaman.
  if (!session && isDashboardPage) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL(getDefaultPathForRole(session.role), req.url))
  }

  if (session && isDashboardPage) {
    if (!isPathAllowedForRole(session.role, pathname)) {
      return NextResponse.redirect(new URL(getDefaultPathForRole(session.role), req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
