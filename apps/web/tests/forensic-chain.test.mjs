/**
 * One function name, two truths: verify_signature is real, the Drive actions are not.
 *
 * Measured 22 Nov 2026. GET /evidence/{id}/verify was added in this item and runs the same engine as the agent tool
 * verify_evidence_integrity; against the live table it answered {"verdict":"intact","intact":true,
 * "stored_sha256":"c129e352..."} for a cloud_finding object, and EVIDENCE_NOT_FOUND for another tenant's fixture.
 * export_package and gdsEvidenceDriveExport need Google Drive, and this host holds no service account.
 *
 * The old page called verify_signature, ignored the result, and logged "Signature verified for <id>" unconditionally,
 * so it claimed a verification it never read. There is also no signing key here: the check proves the bytes have not
 * changed, not who wrote them.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const SOURCE = new URL('../src/api/base44Client.js', import.meta.url);
const PAGE = new URL('../src/pages/forensics/ForensicEvidenceVaultPage.jsx', import.meta.url);

async function loadAdapter(responder) {
  const source = await readFile(SOURCE, 'utf8');
  const dir = await mkdtemp(join(tmpdir(), 'chain-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  global.fetch = responder;
  return import(pathToFileURL(file).href);
}

function jsonResponder(body) {
  const calls = [];
  const responder = async (url, init) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
             text: async () => JSON.stringify(body), json: async () => body };
  };
  responder.calls = calls;
  return responder;
}

test('verify_signature calls the real verify route for that evidence id', async () => {
  const responder = jsonResponder({
    evidence_id: '68358ebf-c173-4980-b456-4b4becdf0a54', intact: true, verdict: 'intact',
    stored_sha256: 'a'.repeat(64), measured_sha256: 'a'.repeat(64),
    stored_size_bytes: 485, measured_size_bytes: 485, checked_content: 'MinIO object bytes',
  });
  const { base44 } = await loadAdapter(responder);
  const { data } = await base44.functions.invoke('gdsForensicChain', {
    action: 'verify_signature', evidence_id: '68358ebf-c173-4980-b456-4b4becdf0a54',
  });
  assert.match(responder.calls[0].url, /\/evidence\/68358ebf-c173-4980-b456-4b4becdf0a54\/verify$/);
  assert.equal(data.intact, true);
  assert.equal(data.verdict, 'intact');
  assert.match(data.note, /Not a signature/);
});

test('a modified object reaches the page as modified, with both hashes kept apart', async () => {
  const responder = jsonResponder({ intact: false, verdict: 'modified',
    stored_sha256: 'a'.repeat(64), measured_sha256: 'b'.repeat(64), stored_size_bytes: 485, measured_size_bytes: 490 });
  const { base44 } = await loadAdapter(responder);
  const { data } = await base44.functions.invoke('gdsForensicChain', { action: 'verify_signature', evidence_id: 'x' });
  assert.equal(data.intact, false);
  assert.equal(data.verdict, 'modified');
  assert.notEqual(data.stored_sha256, data.measured_sha256);
});

test('the Drive actions refuse with a reason that names the missing service account', async () => {
  const responder = jsonResponder({});
  const { base44 } = await loadAdapter(responder);
  await assert.rejects(
    () => base44.functions.invoke('gdsForensicChain', { action: 'export_package' }),
    (error) => {
      assert.match(error.message, /Google service account/);
      assert.match(error.message, /Integrity verification on the same page is real/);
      return true;
    },
  );
  await assert.rejects(
    () => base44.functions.invoke('gdsEvidenceDriveExport', { action: 'push_evidence' }),
    (error) => { assert.match(error.message, /Google Drive export needs a service account/); return true; },
  );
  assert.equal(responder.calls.length, 0, 'nothing may be sent for an action that cannot run');
});

test('collect_evidence is absent rather than silently mapped to a title', async () => {
  const { base44 } = await loadAdapter(jsonResponder({}));
  await assert.rejects(() => base44.functions.invoke('gdsForensicChain', { action: 'collect_evidence' }));
});

test('an unknown action on the chain does not fall through to a served route', async () => {
  const responder = jsonResponder({});
  const { base44 } = await loadAdapter(responder);
  await assert.rejects(() => base44.functions.invoke('gdsForensicChain', { action: 'nonsense' }));
  assert.equal(responder.calls.length, 0);
});

test('evidence.upload posts multipart and never stringifies the FormData', async () => {
  const responder = jsonResponder({ id: 'e1' });
  const { base44 } = await loadAdapter(responder);
  const file = new Blob(['hello'], { type: 'text/plain' });
  await base44.evidence.upload(file, { subject_type: 'log', subject_id: 's-1' });
  const { init } = responder.calls[0];
  assert.equal(init.method, 'POST');
  assert.ok(init.body instanceof FormData, 'the body must be FormData, not JSON');
  assert.equal(init.headers, undefined, 'a multipart body must set its own boundary');
});

test('the page reads the verdict instead of announcing one', async () => {
  const page = await readFile(PAGE, 'utf8');
  assert.ok(!page.includes('Signature verified for'), 'the old page logged success without reading the result');
  assert.match(page, /verdict\.intact/);
  assert.match(page.replace(/\s+/g, ' '), /SHA-256 recomputed and matched/);
  assert.match(page.replace(/\s+/g, ' '), /no signing key exists here/i);
  assert.match(page.replace(/\s+/g, ' '), /no legal hold store/);
});
