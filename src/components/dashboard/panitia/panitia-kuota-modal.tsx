'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Save } from 'lucide-react'

interface KuotaRow {
  divisi: string
  label: string
  maksimal: number
  terisi: number
}

export function PanitiaKuotaModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [rows, setRows] = useState<KuotaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingIdx, setSavingIdx] = useState<number | null>(null)

  useEffect(() => {
    if (!isOpen) return
    fetch('/api/panitia/kuota')
      .then(async (res) => {
        const result = await res.json()
        if (!res.ok) throw new Error(result?.message || 'Gagal memuat kuota divisi')
        setRows(result.data)
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
      })
      .finally(() => setLoading(false))
  }, [isOpen])

  async function handleSave(row: KuotaRow, index: number) {
    const nilai = Number(row.maksimal)
    if (!Number.isInteger(nilai) || nilai < 1 || nilai > 500) {
      toast.error('Nilai harus angka bulat antara 1 sampai 500')
      return
    }
    setSavingIdx(index)
    try {
      const res = await fetch('/api/panitia/kuota', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ divisi: row.divisi, maksimal: nilai }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result?.message || 'Gagal menyimpan kuota')
      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, maksimal: nilai } : r)))
      toast.success(`Kuota ${row.label} disimpan`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setSavingIdx(null)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="BATAS MAKSIMAL PANITIA PER DIVISI">
      <div className="flex flex-col gap-2">
        <p className="font-body text-[11px] text-[var(--color-text-muted)] mb-1">
          Atur jumlah maksimal panitia per divisi. Kuota tidak bisa lebih kecil dari jumlah yang sudah terisi.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-[55vh] overflow-y-auto pr-1">
            {rows.map((row, index) => (
              <div
                key={row.divisi}
                className="flex items-center gap-2 border border-[var(--color-border)] rounded-[var(--radius-input)] px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-body text-sm text-event-navy">{row.label}</span>
                  <span className="block font-body text-[10px] text-gray-400">
                    Terisi {row.terisi} orang
                  </span>
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={Number.isFinite(row.maksimal) ? row.maksimal : ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? NaN : Number(e.target.value)
                      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, maksimal: val } : r)))
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleSave(row, index)}
                  disabled={savingIdx === index}
                  className="flex items-center gap-1"
                >
                  {savingIdx === index ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Simpan
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </Modal>
  )
}