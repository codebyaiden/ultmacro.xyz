import { readdir, readFile } from 'node:fs/promises';
import { query } from '../api/_lib/db.mjs';

const directory = new URL('../db/migrations/', import.meta.url);
const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
const statements = [];
for (const file of files) {
  const source = await readFile(new URL(file, directory), 'utf8');
  statements.push(...source.split(/^-- statement\s*$/m).map((statement) => statement.trim()).filter(Boolean));
}

for (const statement of statements) {
  await query(statement);
}

console.log(`applied ${statements.length} Strategy Network migration statements`);