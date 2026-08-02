import QRCode from 'qrcode'
import { saveBuffer } from './save-file'

export async function generateQrCode(token: string, filename: string): Promise<string> {
  const buffer = await QRCode.toBuffer(token, {
    type: 'png',
    width: 512,
    margin: 2,
    color: {
      dark: '#12206B',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  })

  return saveBuffer(buffer, 'qrcodes', filename)
}