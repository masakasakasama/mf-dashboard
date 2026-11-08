// Shared by the browser (dataSource.js) and Node (scripts/finance-data.mjs).
// Finance JSON is published only as AES-256-GCM ciphertext; the key is derived
// from a passphrase that never leaves the user's devices / GitHub secrets.

const VERSION = 1;
const ITERATIONS = 600000;
const subtle = globalThis.crypto.subtle;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes) {
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function fromBase64(text) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

async function deriveKey(passphrase, salt, iterations) {
  const material = await subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export function isEncryptedEnvelope(value) {
  return Boolean(value && value.v === VERSION && value.alg === 'AES-256-GCM'
    && typeof value.salt === 'string' && typeof value.iv === 'string' && typeof value.ct === 'string');
}

export async function encryptJson(data, passphrase) {
  if (!passphrase) throw new Error('passphrase is required');
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, ITERATIONS);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(data))));
  return { v: VERSION, alg: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iter: ITERATIONS, salt: toBase64(salt), iv: toBase64(iv), ct: toBase64(ct) };
}

export async function decryptJson(envelope, passphrase) {
  if (!isEncryptedEnvelope(envelope)) throw new Error('暗号化データの形式が不正');
  const key = await deriveKey(passphrase, fromBase64(envelope.salt), envelope.iter || ITERATIONS);
  let plain;
  try {
    plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.ct));
  } catch {
    const error = new Error('パスワードが違います');
    error.code = 'BAD_PASSPHRASE';
    throw error;
  }
  return JSON.parse(decoder.decode(plain));
}
