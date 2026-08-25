import path from 'path'
import { GlobalFonts } from '@napi-rs/canvas'

let fontsRegistered = false

export function registerFonts() {
  if (fontsRegistered) return

  const fontDir = path.join(process.cwd(), 'src', 'assets', 'fonts')
  GlobalFonts.registerFromPath(path.join(fontDir, 'Silkscreen-Regular.ttf'), 'Silkscreen')
  GlobalFonts.registerFromPath(path.join(fontDir, 'Silkscreen-Bold.ttf'), 'Silkscreen-Bold')
  GlobalFonts.registerFromPath(path.join(fontDir, 'Arial-Regular.ttf'), 'Arial')
  GlobalFonts.registerFromPath(path.join(fontDir, 'Arial-Bold.ttf'), 'Arial-Bold')

  fontsRegistered = true
}