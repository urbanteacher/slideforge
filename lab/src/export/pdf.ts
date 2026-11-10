// A PDF file of pictures, one to a page, each page the picture's own shape (Send to…, BACKLOG CS-07). The student PDF
// the shell prints goes through the browser's print dialog, which gives no file to hand to another app; this makes
// one. JPEG pictures go in as they are (DCTDecode), so nothing is re-encoded and no library is needed.

/** A JPEG's width and height in pixels, read from its frame header; null when it is not a JPEG. */
export function jpegSize(bytes: Uint8Array): { w: number; h: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    const marker = bytes[i + 1];
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    // Start of frame: baseline, extended, progressive (C0–C3, C5–C7, C9–CB, CD–CF).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { h: (bytes[i + 5] << 8) | bytes[i + 6], w: (bytes[i + 7] << 8) | bytes[i + 8] };
    }
    i += 2 + len;
  }
  return null;
}

/** The bytes of a `data:image/jpeg;base64,` URL. */
export function dataUrlBytes(url: string): Uint8Array {
  const b64 = url.slice(url.indexOf(',') + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** PDF text string: ASCII kept, brackets and backslashes escaped, anything else dropped. */
const pdfText = (s: string) => s.replace(/[^\x20-\x7e]/g, '').replace(/[\\()]/g, (c) => `\\${c}`);

/**
 * A PDF with one JPEG per page. `widthPt` is each page's width in points (72 to the inch); its height follows the
 * picture's shape. 960 pt is 13.33 in, PowerPoint's widescreen width, so a 16:9 slide prints as a slide does.
 */
export function buildPdf(jpegs: Uint8Array[], title = '', widthPt = 960): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const push = (p: Uint8Array | string) => { const b = typeof p === 'string' ? enc.encode(p) : p; parts.push(b); size += b.length; };
  // Objects: 1 catalog, 2 pages, 3 info, then per page: page, contents, image.
  const pageIds = jpegs.map((_, k) => 4 + k * 3);
  const obj = (id: number, body: () => void) => { offsets[id] = size; push(`${id} 0 obj\n`); body(); push('\nendobj\n'); };

  push('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Count ${jpegs.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`));
  obj(3, () => push(`<< /Title (${pdfText(title)}) /Producer (SlideForge) >>`));
  jpegs.forEach((jpg, k) => {
    const dim = jpegSize(jpg) ?? { w: 1600, h: 900 };
    const w = widthPt;
    const h = Math.round((widthPt * dim.h) / dim.w * 100) / 100;
    const [page, contents, image] = [pageIds[k], pageIds[k] + 1, pageIds[k] + 2];
    const draw = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    obj(page, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${contents} 0 R >>`));
    obj(contents, () => push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`));
    obj(image, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${dim.w} /Height ${dim.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`);
      push(jpg);
      push('\nendstream');
    });
  });
  const count = 4 + jpegs.length * 3;
  const xref = size;
  let table = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let id = 1; id < count; id++) table += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}
