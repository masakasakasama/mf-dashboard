import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { encryptJson, decryptJson, isEncryptedEnvelope } from '../src/financeCrypto.js';

test('round-trips JSON with the right passphrase', async () => {
  const data = { start: { balance: 1 }, events: [{ label: 'テスト', amount: -2 }] };
  const envelope = await encryptJson(data, 'correct horse');
  assert.ok(isEncryptedEnvelope(envelope));
  assert.ok(!JSON.stringify(envelope).includes('テスト'));
  assert.deepEqual(await decryptJson(envelope, 'correct horse'), data);
});

test('rejects a wrong passphrase', async () => {
  const envelope = await encryptJson({ a: 1 }, 'right');
  await assert.rejects(decryptJson(envelope, 'wrong'), (error) => error.code === 'BAD_PASSPHRASE');
});

test('committed finance files are ciphertext only', async () => {
  for (const name of ['cashflow', 'subscriptions']) {
    const envelope = JSON.parse(await readFile(new URL(`../public/${name}.enc.json`, import.meta.url), 'utf8'));
    assert.ok(isEncryptedEnvelope(envelope), `${name}.enc.json must be encrypted`);
  }
});
