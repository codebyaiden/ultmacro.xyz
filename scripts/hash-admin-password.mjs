import readline from 'node:readline';
import { hashSecret } from '../api/_lib/security.mjs';

const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
prompt.question('Admin password (input is not stored by this script): ', async (password) => {
  try {
    console.log(await hashSecret(password));
  } finally {
    prompt.close();
  }
});