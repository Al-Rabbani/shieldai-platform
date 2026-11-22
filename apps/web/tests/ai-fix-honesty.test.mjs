/**
 * Item 14: the AI Fix panels promised a patch script that no engine here produces.
 *
 * Measured: four routed pages post {action:"generate_code"} and render response.code_output. Item 13 pointed that function
 * at the real reasoning engine, which returns reasoning and tool receipts but never code_output, so the GENERATED CODE
 * block could not appear. The pages now keep the real reasoning answer and state that no code generator exists.
 *
 * These tests pin that statement so it cannot be quietly softened into a promise, and pin the wiring so a fifth code
 * panel cannot be added without the same note.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const SRC = path.join(import.meta.dirname, '..', 'src');
const read = (rel) => readFileSync(path.join(SRC, rel), 'utf8');

const CODE_PANELS = [
  'pages/VMSecurityPage.jsx',
  'pages/ContainerSecurityPage.jsx',
  'pages/CloudSecurityPage.jsx',
  'pages/VulnerabilityManagementPage.jsx',
];

test('every AI Fix panel passes the honest note to its modal', () => {
  for (const rel of CODE_PANELS) {
    const src = read(rel);
    assert.match(src, /NO_CODE_GENERATOR_NOTE/, `${rel} must import the note`);
    assert.match(src, /codeAbsentNote=\{NO_CODE_GENERATOR_NOTE\}/, `${rel} must pass the note to its modal`);
  }
});

test('the note states an absence, not a delay', () => {
  const modal = read('components/shared/AIResponseModal.jsx');
  const m = modal.match(/export const NO_CODE_GENERATOR_NOTE =([\s\S]*?);\n/);
  assert.ok(m, 'the note constant must exist');
  const text = m[1].replace(/["+\n]|^\s*/gm, ' ').replace(/\s+/g, ' ');
  assert.match(text, /no code-generation engine/i);
  // A promise of future code is the defect this replaces.
  assert.doesNotMatch(text, /coming soon|will be generated|temporarily unavailable|try again/i);
});

test('both modals render the note only when there is no code block', () => {
  for (const rel of ['components/shared/AIResponseModal.jsx', 'components/vulnmgmt/VulnAIModal.jsx']) {
    const src = read(rel);
    assert.match(src, /\{!codeOutput && codeAbsentNote && \(/, `${rel} must gate the note on a missing code block`);
    assert.match(src, /NO PATCH SCRIPT/, `${rel} must label the note`);
  }
});

test('no other file promises code from a response that cannot carry it', async () => {
  // GDSCoPilotPage only forwards a field that is always null; ChatMessage renders it when present. Neither promises a
  // script to the reader, so both are allowed - but a new page that reads code_output must join CODE_PANELS with a note.
  const allowed = new Set([...CODE_PANELS, 'pages/gds/GDSCoPilotPage.jsx', 'components/copilot/ChatMessage.jsx']);
  const { execSync } = await import('node:child_process');
  const found = execSync('grep -rl code_output --include=*.jsx .', { cwd: SRC, encoding: 'utf8' })
    .trim().split('\n').map((l) => l.replace(/^\.\//, ''));
  for (const rel of found) {
    assert.ok(allowed.has(rel), `${rel} reads code_output without stating that no generator exists`);
  }
});
