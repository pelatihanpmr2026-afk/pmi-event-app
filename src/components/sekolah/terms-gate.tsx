'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TNC_CONTENT, TNC_VERSION } from '@/lib/tnc-content'

const agreementKey = `pmr2026_tnc_agreed_${TNC_VERSION}`
export function TermsGate({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const [hasAgreed, setHasAgreed] = useState<boolean | null>(null); const [checked, setChecked] = useState(false)
  useEffect(() => { const timer = window.setTimeout(() => setHasAgreed(localStorage.getItem(agreementKey) === 'true'), 0); return () => window.clearTimeout(timer) }, [])
  if (hasAgreed === null) return <div className="min-h-screen" aria-hidden="true" />
  if (hasAgreed) return <>{children}</>
  function agree() { if (!checked) return; localStorage.setItem(agreementKey, 'true'); setHasAgreed(true) }
  return <main className="min-h-screen py-10 px-4 flex flex-col items-center"><div className="w-full max-w-lg"><Card pixel><CardHeader variant="blue" pixel><h1 className="font-heading text-xs sm:text-sm text-white">SYARAT DAN KETENTUAN PENDAFTARAN</h1></CardHeader><CardContent className="flex flex-col gap-4"><p className="font-body text-xs text-event-navy/70">Ringkasan ketentuan penting pendaftaran.</p><ul className="list-disc pl-4 flex flex-col gap-2 font-body text-xs text-event-navy">{TNC_CONTENT.slice(0, 4).map((point) => <li key={point}>{point}</li>)}</ul><details className="border-2 border-event-navy/20 p-3"><summary className="cursor-pointer font-body font-bold text-xs text-event-navy">Baca ketentuan lengkap</summary><ol className="mt-3 list-decimal pl-4 flex flex-col gap-2 font-body text-xs text-event-navy">{TNC_CONTENT.map((point) => <li key={point}>{point}</li>)}</ol></details><label className="flex items-start gap-2 font-body text-xs text-event-navy cursor-pointer"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="mt-0.5" /><span>Saya telah membaca dan menyetujui syarat dan ketentuan versi {TNC_VERSION}.</span></label><div className="flex flex-col sm:flex-row gap-3"><Button type="button" variant="outline" pixel onClick={() => { toast.error('Persetujuan diperlukan untuk melanjutkan pendaftaran'); router.push('/') }} className="flex-1">Tidak Setuju</Button><Button type="button" variant="primary" pixel onClick={agree} disabled={!checked} className="flex-1">Setuju dan Lanjut Daftar</Button></div></CardContent></Card></div></main>
}
