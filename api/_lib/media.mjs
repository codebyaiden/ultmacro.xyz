import { mkdir, writeFile } from 'node:fs/promises';
import pathModule from 'node:path';

const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

function startsWith(bytes, values) {
  return values.every((value, index) => bytes[index] === value);
}

function jpegDimensions(bytes) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + length + 2 > bytes.length) break;
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { height: (bytes[offset + 5] << 8) | bytes[offset + 6], width: (bytes[offset + 7] << 8) | bytes[offset + 8] };
    }
    offset += length + 2;
  }
  return null;
}

function webpDimensions(bytes) {
  const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (chunk === 'VP8X' && bytes.length >= 30) {
    return {
      width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16)
    };
  }
  if (chunk === 'VP8 ' && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    return {
      width: ((bytes[27] << 8) | bytes[26]) & 0x3fff,
      height: ((bytes[29] << 8) | bytes[28]) & 0x3fff
    };
  }
  if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
    const packed = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return { width: (packed & 0x3fff) + 1, height: ((packed >>> 14) & 0x3fff) + 1 };
  }
  return null;
}

export function validateThumbnail(bytes, declaredType = '') {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!view.length) throw new Error('Thumbnail is empty.');
  if (view.length > MAX_THUMBNAIL_BYTES) throw new Error('Thumbnail must be 2 MB or smaller.');
  let type = '';
  let dimensions = null;
  if (startsWith(view, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    type = 'image/png';
    if (view.length >= 24) {
      dimensions = { width: view[16] * 0x1000000 + view[17] * 0x10000 + view[18] * 0x100 + view[19], height: view[20] * 0x1000000 + view[21] * 0x10000 + view[22] * 0x100 + view[23] };
    }
  } else if (startsWith(view, [0xff, 0xd8, 0xff])) {
    type = 'image/jpeg';
    dimensions = jpegDimensions(view);
  } else if (startsWith(view, [0x52, 0x49, 0x46, 0x46]) && view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50) {
    type = 'image/webp';
    dimensions = webpDimensions(view);
  } else {
    throw new Error('Thumbnail must be a PNG, JPEG, or WebP image. SVG and other formats are not accepted.');
  }
  if (declaredType && declaredType !== type) throw new Error('Thumbnail MIME type does not match its file contents.');
  if (!dimensions || !Number.isFinite(dimensions.width) || !Number.isFinite(dimensions.height)) throw new Error('Thumbnail header is incomplete or unreadable.');
  if (dimensions.width < 120 || dimensions.height < 80 || dimensions.width > 2400 || dimensions.height > 2400) throw new Error('Thumbnail dimensions must be between 120×80 and 2400×2400 pixels.');
  return { contentType: type, width: dimensions.width, height: dimensions.height };
}

export async function uploadPublicBlob(path, body, contentType) {
  const root = process.env.STRATEGY_STORAGE_ROOT;
  if (!root) throw new Error('STRATEGY_STORAGE_ROOT is not configured.');
  const relative = String(path || '').replaceAll('\\', '/').replace(/^\/+/, '');
  if (!relative || relative.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error('Invalid storage path.');
  const target = pathModule.resolve(root, relative);
  const rootPath = pathModule.resolve(root) + pathModule.sep;
  if (!target.startsWith(rootPath)) throw new Error('Invalid storage path.');
  await mkdir(pathModule.dirname(target), { recursive: true, mode: 0o750 });
  await writeFile(target, body, { mode: 0o640 });
  return `/api/files/${relative.split('/').map(encodeURIComponent).join('/')}`;
}

export const MAX_THUMBNAIL_SIZE = MAX_THUMBNAIL_BYTES;