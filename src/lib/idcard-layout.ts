export const ID_CARD_LAYOUT = {
  templateWidth: 832,
  templateHeight: 1095,

  // Template baru sudah resolusi tinggi, tidak perlu upscale lagi
  outputScale: 1,

  photoBox: {
    xPct: 285 / 832,
    yPct: 311 / 1095,
    widthPct: 322 / 832,
    heightPct: 372 / 1095,
  },

  qrBox: {
    xPct: 603 / 832,
    yPct: 832 / 1095,
    widthPct: 209 / 832,
    heightPct: 241 / 1095,
    paddingPct: 0.1, // sedikit padding di dalam box supaya QR tidak nempel di tepi
  },

  nameText: {
    centerYPct: 0.691,
    fontSizePct: 42 / 1095,
    color: '#3653A5',
    maxWidthPct: 0.85,
  },

  divisionText: {
    centerYPct: 0.737,
    fontSizePct: 26 / 1095,
    color: '#EC3E96',
    maxWidthPct: 0.85,
  },
} as const