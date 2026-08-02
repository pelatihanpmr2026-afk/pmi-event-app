'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import Image from 'next/image'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { loginSchema, LoginValues } from '@/lib/validations/auth'

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
      router.push(redirectTo)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <div className="flex items-center gap-3">
        <div className="relative w-62 h-46 shrink-0">
          <Image src="/assets/LogoEvent.png" alt="Logo Event" fill className="object-contain" />
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader variant="blue">
          <h1 className="font-heading text-xs sm:text-sm">ADMIN LOGIN</h1>
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

      <p className="font-body text-xs text-event-navy/50 text-center max-w-xs">
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