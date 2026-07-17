/**
 * Minimal ZIP writer (store method, no compression, no dependencies).
 *
 * Purpose-built for the bot-starter download: a handful of small text files
 * where compression buys nothing but a dependency. Produces a standard ZIP
 * readable by Finder/Explorer/unzip: local file headers + central directory
 * + end-of-central-directory record, with UTF-8 names and unix permissions.
 */

export interface ZipEntry {
  /** Path inside the archive, e.g. "my-bot/index.js". Forward slashes only. */
  name: string
  data: string | Uint8Array
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = (CRC_TABLE[(c ^ (buf[i] as number)) & 0xff] as number) ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

export function buildZip(entries: ZipEntry[]): Buffer {
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()

  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const data = typeof entry.data === 'string' ? Buffer.from(entry.data, 'utf8') : Buffer.from(entry.data)
    const crc = crc32(data)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0) // local file header signature
    local.writeUInt16LE(20, 4) // version needed
    local.writeUInt16LE(0x0800, 6) // flags: UTF-8 names
    local.writeUInt16LE(0, 8) // method: store
    local.writeUInt16LE(dosTime, 10)
    local.writeUInt16LE(dosDate, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(data.length, 18) // compressed size (= raw, stored)
    local.writeUInt32LE(data.length, 22) // uncompressed size
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28) // extra length

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0) // central directory signature
    central.writeUInt16LE(0x031e, 4) // made by: unix, spec 3.0
    central.writeUInt16LE(20, 6) // version needed
    central.writeUInt16LE(0x0800, 8) // flags: UTF-8 names
    central.writeUInt16LE(0, 10) // method: store
    central.writeUInt16LE(dosTime, 12)
    central.writeUInt16LE(dosDate, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30) // extra length
    central.writeUInt16LE(0, 32) // comment length
    central.writeUInt16LE(0, 34) // disk number
    central.writeUInt16LE(0, 36) // internal attrs
    central.writeUInt32LE((0o100644 << 16) >>> 0, 38) // external attrs: -rw-r--r--
    central.writeUInt32LE(offset, 42) // local header offset

    locals.push(local, name, data)
    centrals.push(central, name)
    offset += local.length + name.length + data.length
  }

  const centralSize = centrals.reduce((n, b) => n + b.length, 0)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // end of central directory signature
  eocd.writeUInt16LE(0, 4) // disk number
  eocd.writeUInt16LE(0, 6) // central directory start disk
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralSize, 12)
  eocd.writeUInt32LE(offset, 16) // central directory offset
  eocd.writeUInt16LE(0, 20) // comment length

  return Buffer.concat([...locals, ...centrals, eocd])
}
