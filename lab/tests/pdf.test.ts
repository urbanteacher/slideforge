// The PDF Send to… hands to another app (export/pdf.ts, BACKLOG CS-07): one JPEG per page, each page the picture's
// shape, and a cross-reference table a reader can trust.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPdf, jpegSize, pdfText } from '../src/export/pdf';

/** The smallest bytes jpegSize reads: start of image, an APP0 to skip, then a baseline frame header. */
const fakeJpeg = (w: number, h: number) => new Uint8Array([
  0xff, 0xd8,
  0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
  0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0xff, 0xd9,
]);

test('a JPEG\'s size is read from its frame header, past the other segments', () => {
  assert.deepEqual(jpegSize(fakeJpeg(1600, 900)), { w: 1600, h: 900 });
  assert.equal(jpegSize(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), null);
});

test('one page per picture, each the picture\'s shape at 960 points wide', async () => {
  const pdf = buildPdf([fakeJpeg(1600, 900), fakeJpeg(1600, 1200)], 'Atoms (and air)');
  assert.equal(pdf.type, 'application/pdf');
  const bytes = new Uint8Array(await pdf.arrayBuffer());
  const text = new TextDecoder('latin1').decode(bytes);
  assert.ok(text.startsWith('%PDF-1.4'));
  assert.match(text, /\/Type \/Pages \/Count 2 /);
  assert.match(text, /\/MediaBox \[0 0 960 540\]/);
  assert.match(text, /\/MediaBox \[0 0 960 720\]/);
  assert.match(text, /\/Title \(Atoms \\\(and air\\\)\)/);
  // Every offset in the table points at its object.
  const start = Number(/startxref\n(\d+)/.exec(text)![1]);
  assert.ok(text.slice(start).startsWith('xref'));
  const rows = text.slice(start).split('\n').slice(3).filter((r) => / n $/.test(r));
  rows.forEach((r, k) => assert.ok(text.slice(Number(r.slice(0, 10))).startsWith(`${k + 1} 0 obj`), `object ${k + 1}`));
});

test('a title in any language keeps its letters; a page that is not a JPEG is refused, not written as one', async () => {

  assert.equal(pdfText('Week 4 (colour)'), '(Week 4 \\(colour\\))');
  assert.equal(pdfText('Café'), '<FEFF00430061006600E9>');
  const pdf = new TextDecoder('latin1').decode(new Uint8Array(await buildPdf([fakeJpeg(1600, 900)], 'Café').arrayBuffer()));
  assert.match(pdf, /\/Title <FEFF00430061006600E9>/);
  assert.throws(() => buildPdf([fakeJpeg(1600, 900), new Uint8Array([0x89, 0x50, 0x4e, 0x47])]), /Page 2 could not be drawn as a picture/);
  assert.throws(() => buildPdf([new Uint8Array(0)]), /Page 1/);
});
