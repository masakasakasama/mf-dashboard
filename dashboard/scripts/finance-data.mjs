#!/usr/bin/env node
// Usage (from the dashboard/ folder, with DASHBOARD_PASSPHRASE set):
//   node scripts/finance-data.mjs decrypt   -> private/*.json (git-ignored) for editing
//   node scripts/finance-data.mjs encrypt   -> public/*.enc.json (the only files to commit)
//   node scripts/finance-data.mjs verify    -> checks the committed files are ciphertext only
//   node scripts/finance-data.mjs encrypt-file <in.json> <out.enc.json>
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encryptJson, decryptJson, isEncryptedEnvelope } from '../src/financeCrypto.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['cashflow', 'subscriptions'];
const plainPath = (name) => path.join(root, 'private', `${name}.json`);
const encPath = (name) => path.join(root, 'public', `${name}.enc.json`);

function passphrase() {
  const value = (process.env.DASHBOARD_PASSPHRASE || '').trim();
  if (!value) throw new Error('DASHBOARD_PASSPHRASE is not set');
  return value;
}

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

const commands = {
  async decrypt() {
    await mkdir(path.join(root, 'private'), { recursive: true });
    for (const name of FILES) {
      const data = await decryptJson(await readJson(encPath(name)), passphrase());
      await writeFile(plainPath(name), `${JSON.stringify(data, null, 2)}\n`);
      console.log(`decrypted -> private/${name}.json`);
    }
  },
  async encrypt() {
    for (const name of FILES) {
      const data = await readJson(plainPath(name));
      await writeFile(encPath(name), `${JSON.stringify(await encryptJson(data, passphrase()))}\n`);
      console.log(`encrypted -> public/${name}.enc.json`);
    }
  },
  async 'encrypt-file'(input, output) {
    if (!input || !output) throw new Error('encrypt-file <in.json> <out.enc.json>');
    await writeFile(output, `${JSON.stringify(await encryptJson(await readJson(input), passphrase()))}\n`);
  },
  async verify() {
    for (const name of FILES) {
      if (!isEncryptedEnvelope(await readJson(encPath(name)))) throw new Error(`public/${name}.enc.json is not an encrypted envelope`);
      if (await exists(path.join(root, 'public', `${name}.json`))) throw new Error(`plaintext public/${name}.json must not exist`);
    }
    if (process.env.DASHBOARD_PASSPHRASE) {
      for (const name of FILES) await decryptJson(await readJson(encPath(name)), passphrase());
    }
    console.log('finance data: ciphertext only');
  },
};

const [command, ...args] = process.argv.slice(2);
if (!commands[command]) {
  console.error('commands: decrypt | encrypt | verify | encrypt-file <in> <out>');
  process.exit(2);
}
commands[command](...args).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
