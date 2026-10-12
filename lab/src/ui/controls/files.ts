// A file the teacher picks, read as a data URL (a large picture brought down to size first).

export function readDataUrl(f: File) {
  return new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f); });
}

export async function fileToDataUrl(f: File, max = 2400): Promise<string> {
  const url = await readDataUrl(f);
  if (f.type === 'image/svg+xml' || f.type === 'image/gif') return url;
  const img = new Image();
  img.src = url;
  await img.decode();
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  if (k >= 1 && f.size < 1.5e6) return url;
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/webp', 0.9);
}
