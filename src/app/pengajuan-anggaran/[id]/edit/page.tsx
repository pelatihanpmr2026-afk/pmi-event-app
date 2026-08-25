import { EditPengajuanForm } from '@/components/pengajuan/edit-pengajuan-form'

export default async function EditPengajuanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <main className="min-h-screen py-10 px-4 flex flex-col gap-8 items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-heading text-lg sm:text-xl text-event-navy leading-relaxed">
          EDIT PENGAJUAN ANGGARAN
        </h1>
        <p className="font-body text-xs sm:text-sm text-event-navy/70 max-w-md">
          Verifikasi kepemilikan, lalu tambah atau ubah item barang pengajuan yang masih menunggu
          diproses.
        </p>
      </div>

      <EditPengajuanForm pengajuanId={id} />
    </main>
  )
}