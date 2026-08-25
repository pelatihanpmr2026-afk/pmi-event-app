import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Toaster } from 'sonner'
import './globals.css'

const pressStart2P = localFont({
  src: '../assets/fonts/PressStart2P-Regular.ttf',
  weight: '400',
  variable: '--font-pixel-heading',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Pelantikan & Pelatihan PMR 2026 Se-Kabupaten Cianjur',
  description: 'Website resmi pendaftaran dan manajemen event Pelantikan & Pelatihan PMR 2026 Se-Kabupaten Cianjur oleh PMI.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={`${pressStart2P.variable} font-body antialiased`}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}