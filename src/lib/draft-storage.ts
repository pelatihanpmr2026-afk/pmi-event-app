const DRAFT_KEY = 'pmr2026_draft_sekolah'
const DB_NAME = 'pmr2026_draft'
const STORE_NAME = 'photos'
const DRAFT_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 hari

export interface DraftData {
  currentStep: number
  dataSekolah: unknown
  dataPeserta: unknown
  dataPendamping: unknown
  sekolahId: string | null
  savedAt: number
}

export function saveDraft(data: Omit<DraftData, 'savedAt'>) {
  try {
    const payload: DraftData = { ...data, savedAt: Date.now() }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
  } catch {
    // Storage penuh atau diblokir — abaikan
  }
}

export function loadDraft(): DraftData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DraftData
    if (Date.now() - parsed.savedAt > DRAFT_MAX_AGE) {
      clearDraft()
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // abaikan
  }
  void clearPhotos()
}

// ===== IndexedDB: file foto =====
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function savePhoto(key: string, file: File): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(file, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // abaikan
  }
}

export async function loadPhoto(key: string): Promise<File | null> {
  try {
    const db = await openDB()
    const file = await new Promise<File | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve((req.result as File) ?? null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return file
  } catch {
    return null
  }
}

export async function clearPhotos(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // abaikan
  }
}