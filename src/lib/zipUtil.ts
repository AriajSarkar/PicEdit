// ═══════════════════════════════════════════════════════════════════
// PicEdit — Minimal ZIP file creator (no external dependencies)
//
// Supports: Store (no compression) — images are already compressed
// so re-compressing would waste CPU with no benefit.
// ═══════════════════════════════════════════════════════════════════

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/**
 * Create a ZIP file from an array of entries.
 * Uses Store method (no compression) since images are already compressed.
 */
export function createZip(entries: ZipEntry[]): Blob {
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    // ── Local file header ──────────────────────────────────────────
    const nameBytes = new TextEncoder().encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);

    lv.setUint32(0, 0x04034b50, true);   // Local file header signature
    lv.setUint16(4, 20, true);           // Version needed (2.0)
    lv.setUint16(6, 0, true);            // General purpose flags
    lv.setUint16(8, 0, true);            // Compression method: Store
    lv.setUint16(10, 0, true);           // Last mod time
    lv.setUint16(12, 0, true);           // Last mod date
    lv.setUint32(14, crc, true);         // CRC-32
    lv.setUint32(18, size, true);        // Compressed size
    lv.setUint32(22, size, true);        // Uncompressed size
    lv.setUint16(26, nameBytes.length, true); // File name length
    lv.setUint16(28, 0, true);           // Extra field length
    localHeader.set(nameBytes, 30);

    parts.push(localHeader);
    parts.push(entry.data);

    // ── Central directory entry ────────────────────────────────────
    const cdEntry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdEntry.buffer);

    cv.setUint32(0, 0x02014b50, true);   // Central directory signature
    cv.setUint16(4, 20, true);           // Version made by
    cv.setUint16(6, 20, true);           // Version needed
    cv.setUint16(8, 0, true);            // Flags
    cv.setUint16(10, 0, true);           // Compression: Store
    cv.setUint16(12, 0, true);           // Mod time
    cv.setUint16(14, 0, true);           // Mod date
    cv.setUint32(16, crc, true);         // CRC-32
    cv.setUint32(20, size, true);        // Compressed size
    cv.setUint32(24, size, true);        // Uncompressed size
    cv.setUint16(28, nameBytes.length, true); // Name length
    cv.setUint16(30, 0, true);           // Extra length
    cv.setUint16(32, 0, true);           // Comment length
    cv.setUint16(34, 0, true);           // Disk start
    cv.setUint16(36, 0, true);           // Internal attributes
    cv.setUint32(38, 0, true);           // External attributes
    cv.setUint32(42, offset, true);      // Offset of local header
    cdEntry.set(nameBytes, 46);

    centralDir.push(cdEntry);
    offset += localHeader.length + entry.data.length;
  }

  // ── End of central directory record ──────────────────────────────
  const cdSize = centralDir.reduce((s, e) => s + e.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);

  ev.setUint32(0, 0x06054b50, true);     // EOCD signature
  ev.setUint16(4, 0, true);              // Disk number
  ev.setUint16(6, 0, true);              // Disk with CD
  ev.setUint16(8, entries.length, true);  // Entries on this disk
  ev.setUint16(10, entries.length, true); // Total entries
  ev.setUint32(12, cdSize, true);         // Size of central directory
  ev.setUint32(16, offset, true);         // Offset of CD start
  ev.setUint16(20, 0, true);             // Comment length

  // Convert Uint8Array → ArrayBuffer for Blob compatibility (strict TS)
  const toBuffer = (u: Uint8Array): ArrayBuffer =>
    u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
  const allParts = [...parts, ...centralDir, eocd].map(toBuffer);
  return new Blob(allParts, { type: 'application/zip' });
}

/**
 * Download a Blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── CRC-32 (IEEE 802.3) ──────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
