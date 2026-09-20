import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist');
const routes = [
  '',
  'aboutus',
  'features',
  'how-it-works',
  'faq',
  'guide',
  'guide/sessions',
  'guide/requirements',
  'guide/install',
  'guide/display',
  'guide/first-run',
  'guide/recording',
  'guide/discord',
  'guide/tools',
  'guide/troubleshooting',
  'guide/safety',
  'strategies',
  'download',
  'download/latest',
  'download/v1.3.3',
  'download/v1.3.4',
  'download/v1.3.4a',
  'download/v1.3.4b',
  'download/v1.3.5',
  'early-access',
];

const localReference = /(?:href|src)="([^"]+)"/g;
let references = 0;

for (const route of routes) {
  const file = join(dist, route, 'index.html');
  await access(file);
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(localReference)) {
    const raw = match[1].split('#')[0].split('?')[0];
    if (!raw || ['#', '/', 'http:', 'https:', 'mailto:', 'javascript:', 'data:'].some((prefix) => raw.startsWith(prefix))) continue;
    references += 1;
    await access(resolve(join(dist, route), raw));
  }
}

console.log(`verified ${routes.length} route files and ${references} local references`);
