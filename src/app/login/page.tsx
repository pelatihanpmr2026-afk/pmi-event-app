'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Lock, Radio } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { loginSchema, LoginValues } from '@/lib/validations/auth'

/** Corner-bracket HUD frame — same decorative language used on the homepage. */
function HudCorners({ tone = 'navy' }: { tone?: 'navy' | 'white' }) {
  const color = tone === 'navy' ? 'border-event-navy/25' : 'border-white/30'
  const base = 'absolute w-5 h-5 sm:w-6 sm:h-6'
  return (
    <div aria-hidden="true" className="pointer-events-none">
      <span className={`${base} top-2 left-2 border-t-3 border-l-3 ${color}`} />
      <span className={`${base} top-2 right-2 border-t-3 border-r-3 ${color}`} />
      <span className={`${base} bottom-2 left-2 border-b-3 border-l-3 ${color}`} />
      <span className={`${base} bottom-2 right-2 border-b-3 border-r-3 ${color}`} />
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginValues) {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.message || 'Login gagal')
      }

      toast.success('Login berhasil')
      const redirectTo = searchParams.get('redirect') || '/dashboard'
      // Hindari kembali ke halaman login setelah autentikasi berhasil.
      // Refresh membuat server components/middleware membaca cookie sesi baru.
      router.replace(redirectTo)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-12 overflow-hidden bg-event-cream">
      {/* animated pixel grid backdrop — same treatment as the homepage hero, opacity/GPU only */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(54,83,165,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(54,83,165,0.6) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 65% 55% at 50% 35%, black 40%, transparent 90%)',
        }}
      />
      <span aria-hidden="true" className="pixel-particle hidden sm:block absolute top-20 left-[15%] w-2.5 h-2.5 bg-event-pink" style={{ animationDelay: '0s' }} />
      <span aria-hidden="true" className="pixel-particle hidden sm:block absolute bottom-24 right-[16%] w-2 h-2 bg-event-blue" style={{ animationDelay: '1s' }} />
      <span aria-hidden="true" className="pixel-particle hidden sm:block absolute bottom-16 left-[22%] w-2 h-2 bg-event-yellow" style={{ animationDelay: '1.7s' }} />

      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 inline-flex items-center gap-1.5 font-heading text-[9px] text-event-navy/50 hover:text-event-pink transition-colors z-10"
      >
        <ArrowLeft size={12} />
        BERANDA
      </Link>

      <div className="relative flex flex-col items-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-heading text-[8px] text-event-navy/40 tracking-[0.2em]">
          <Radio size={10} className="text-event-pink animate-blink" />
          AKSES TERBATAS
        </span>
        <div className="relative w-52 h-40 sm:w-62 sm:h-46 shrink-0">
          <Image src="/assets/LogoEvent.png" alt="Logo Event" fill className="object-contain" priority />
        </div>
      </div>

      <div className="relative w-full max-w-sm">
        <span
          aria-hidden="true"
          className="hidden sm:block absolute -inset-4 pixel-corners bg-event-blue/10 blur-2xl"
        />
        <Card className="relative w-full">
          <HudCorners tone="navy" />
          <CardHeader variant="blue">
            <div className="flex items-center gap-2">
              <Lock size={14} />
              <h1 className="font-heading text-xs sm:text-sm">ADMIN LOGIN</h1>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Username"
                placeholder="Masukkan username"
                error={errors.username?.message}
                {...register('username')}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Masukkan password"
                error={errors.password?.message}
                {...register('password')}
              />
              <Button type="submit" variant="primary" isLoading={isSubmitting} className="mt-2">
                Masuk
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <p className="relative font-body text-xs text-event-navy/50 text-center max-w-xs">
        Halaman ini khusus untuk admin/panitia inti pengelola event.
      </p>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
