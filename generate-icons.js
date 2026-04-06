/**
 * Generates minimal PNG icons for the Chrome Extension.
 * Uses only Node.js built-ins (zlib, fs) — no external dependencies.
 *
 * Run: node generate-icons.js
 */

const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// CRC32 lookup table
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuffer.length, 0);
  const crcInput = Buffer.concat([typeBytes, dataBuffer]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBytes, dataBuffer, crcBuf]);
}

/**
 * Creates a solid-color PNG with an optional rounded "L" logo shape.
 * @param {number} size   - Image width and height in pixels
 * @param {number[]} bg   - Background color [R, G, B]
 * @param {number[]} fg   - Foreground color [R, G, B]
 */
function createPNG(size, bg, fg) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 2; // RGB color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Build raw pixel data (filter byte + RGB per row)
  const rows = [];
  const padding = Math.max(1, Math.round(size * 0.15));

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      // Draw a simple "L" shape in the foreground color
      const inLVertical =
        x >= padding && x < padding + Math.max(1, Math.round(size * 0.2)) &&
        y >= padding && y < size - padding;
      const inLHorizontal =
        y >= size - padding - Math.max(1, Math.round(size * 0.2)) &&
        y < size - padding &&
        x >= padding && x < size - padding;

      const [r, g, b] = inLVertical || inLHorizontal ? fg : bg;
      row[1 + x * 3] = r;
      row[1 + x * 3 + 1] = g;
      row[1 + x * 3 + 2] = b;
    }
    rows.push(row);
  }

  const rawData = Buffer.concat(rows);
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  return Buffer.concat([
    PNG_SIG,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// LocalPro brand colors: blue background, white "L"
const BG = [26, 86, 219]; // #1A56DB
const FG = [255, 255, 255]; // #FFFFFF

const outDir = path.join(__dirname, "extension", "icons");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  const png = createPNG(size, BG, FG);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${png.length} bytes)`);
}

console.log("Icons generated successfully.");
