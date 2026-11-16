// Maintenance only: copy the existing owner-approved public VPS library, never
// execute it, forward visitor headers, or fetch a URL supplied by a visitor.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const AD_LIBRARY = Object.freeze({
  source: 'https://api-origin.ultmacro.xyz/assets/adcash-library.js',
  bytes: 656567,
  sha256: '4ec6131bb937c3c9276c36389c8f54a8c691283a3b4569bb473d9faf924db6a4',
});
const asset = new URL('../assets/adcash-library', import.meta.url);
const MAX_BYTES = 2 * 1024 * 1024;

export function verifyAdLibrary(bytes) {
  assert.equal(bytes.length, AD_LIBRARY.bytes, 'Approved Adcash library size changed; review before updating the pin');
  assert(!/^\s*</.test(bytes.subarray(0, 256).toString('utf8')), 'HTML is not an ad library');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), AD_LIBRARY.sha256, 'Approved Adcash library hash changed; review before updating the pin');
  return bytes;
}

export async function downloadAdLibrary(fetchImpl = fetch) {
  const response = await fetchImpl(AD_LIBRARY.source, {
    method: 'GET', redirect: 'error', credentials: 'omit',
    headers: { Accept: 'application/javascript' },
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200, 'Approved library origin did not return 200');
  assert(/^(?:application|text)\/(?:javascript|x-javascript|ecmascript)(?:;|$)/i.test(response.headers.get('content-type') || ''), 'Approved library origin did not return JavaScript');
  assert(response.body, 'Empty approved library response');
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Approved library exceeds size limit'); }
    chunks.push(value);
  }
  return verifyAdLibrary(Buffer.concat(chunks, size));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  assert(['--check', '--sync'].includes(mode), 'Use --check for offline verification or --sync to copy the pinned public library');
  if (mode === '--sync') await writeFile(asset, await downloadAdLibrary());
  verifyAdLibrary(await readFile(asset));
  console.log(`PASS: approved Adcash static library; ${AD_LIBRARY.bytes} bytes; SHA-256 ${AD_LIBRARY.sha256}`);
}
