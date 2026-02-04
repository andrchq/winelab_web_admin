export function uuidv4(): string {
  // Современные браузеры
  if (typeof globalThis !== "undefined") {
    const c: any = (globalThis as any).crypto
    if (c && typeof c.randomUUID === "function") return c.randomUUID()

    // WebCrypto fallback (если доступен getRandomValues)
    if (c && typeof c.getRandomValues === "function") {
      const bytes = new Uint8Array(16)
      c.getRandomValues(bytes)

      // RFC4122 v4
      bytes[6] = (bytes[6] & 0x0f) | 0x40
      bytes[8] = (bytes[8] & 0x3f) | 0x80

      const hex = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("")
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
  }

  // Самый последний fallback (без криптостойкости)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, ch => {
    const r = (Math.random() * 16) | 0
    const v = ch === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
