/**
 * A store-only ZIP writer. No compression, no dependency: the evidence pack (O-04, §14.8)
 * is mostly PDFs and photos that do not compress, and what matters is that the archive
 * opens everywhere, keeps the pack's folder structure and carries a CRC for each file.
 *
 * Format: local file header + data per entry, then a central directory and its end record
 * (PKWARE APPNOTE 4.4.x). UTF-8 names are flagged (bit 11).
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++)
    c = (CRC_TABLE[(c ^ (bytes[i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export interface ZipEntry {
  /** Forward slashes for folders; no leading slash. */
  readonly name: string
  readonly data: Uint8Array
  readonly modified?: Date | undefined
}

function dosDateTime(d: Date): { date: number; time: number } {
  const year = Math.max(1980, d.getUTCFullYear())
  return {
    date: ((year - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate(),
    time: (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | Math.floor(d.getUTCSeconds() / 2),
  }
}

function u16(v: number): number[] {
  return [v & 0xff, (v >>> 8) & 0xff]
}
function u32(v: number): number[] {
  return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]
}

export function buildZip(entries: readonly ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: number[] = []
  let offset = 0
  for (const e of entries) {
    const name = encoder.encode(e.name)
    const crc = crc32(e.data)
    const { date, time } = dosDateTime(e.modified ?? new Date())
    const local = new Uint8Array([
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0x0800),
      ...u16(0),
      ...u16(time),
      ...u16(date),
      ...u32(crc),
      ...u32(e.data.length),
      ...u32(e.data.length),
      ...u16(name.length),
      ...u16(0),
    ])
    parts.push(local, name, e.data)
    central.push(
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(0x0800),
      ...u16(0),
      ...u16(time),
      ...u16(date),
      ...u32(crc),
      ...u32(e.data.length),
      ...u32(e.data.length),
      ...u16(name.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
      ...name,
    )
    offset += local.length + name.length + e.data.length
  }
  const centralBytes = new Uint8Array(central)
  const end = new Uint8Array([
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(centralBytes.length),
    ...u32(offset),
    ...u16(0),
  ])
  const total = parts.reduce((n, p) => n + p.length, 0) + centralBytes.length + end.length
  const out = new Uint8Array(total)
  let at = 0
  for (const p of [...parts, centralBytes, end]) {
    out.set(p, at)
    at += p.length
  }
  return out
}
