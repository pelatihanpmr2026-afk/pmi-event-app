'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function PreviewPage() {
  return (
    <div className="min-h-screen p-8 flex flex-col gap-8 items-center">
      <h1 className="font-heading text-2xl text-event-navy text-center leading-relaxed">
        DESIGN SYSTEM PREVIEW
      </h1>

      <Card className="w-full max-w-xl">
        <CardHeader variant="pink">
          <h2 className="font-heading text-sm">CONTOH FORM</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input label="Nama Lengkap" placeholder="Masukkan nama" />
          <Select
            label="Asal Unit"
            placeholder="Pilih unit"
            options={[
              { value: 'KSR_MARKAS', label: 'KSR Markas' },
              { value: 'KSR_UNSUR', label: 'KSR Univ. UNSUR' },
              { value: 'KSR_UNPI', label: 'KSR Univ. UNPI' },
            ]}
          />
          <div className="flex gap-3">
            <Badge variant="success">TERDAFTAR</Badge>
            <Badge variant="warning">HADIR</Badge>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="primary">Daftar Sekarang</Button>
            <Button variant="secondary">Batal</Button>
            <Button variant="accent">Download</Button>
            <Button variant="outline">Kembali</Button>
            <Button variant="primary" isLoading>Loading</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}