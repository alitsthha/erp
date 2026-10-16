import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
let sequence = 0;
function load(file, mocks = {}) {
  const filename = path.join(root, file);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, Date, Error, crypto: { randomUUID: () => `run-${++sequence}` }, console: { error() {} },
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
  }, { filename });
  return module.exports;
}
const resetPath = '_maintenance/databaseReset';
function database(initial = {}) {
  const records = new Map(Object.entries(initial));
  const events = [];
  const sizes = [];
  const reads = new Map();
  let failGroup;
  let failBatch = 0;
  let commits = 0;
  let admin = true;
  let onRead;
  const ref = (path) => ({ path, id: path.split('/').at(-1) });
  const snapshot = (reference) => ({ ref: reference, id: reference.id, exists: () => records.has(reference.path), data: () => records.get(reference.path) });
  const firestore = {
    doc: (_db, path) => ref(path),
    collectionGroup: (_db, name) => ({ name }),
    query: (reference, constraint) => ({ ...reference, limit: constraint.limit }),
    limit: (value) => ({ limit: value }),
    serverTimestamp: () => ({ toMillis: () => Date.now() }),
    runTransaction: async (_db, callback) => {
      const mutations = [];
      const result = await callback({
        get: async (reference) => { if (!admin && !records.has(resetPath)) throw Object.assign(new Error('Denied'), { code: 'permission-denied' }); return snapshot(reference); },
        set: (reference, value) => mutations.push(() => records.set(reference.path, value)),
        update: (reference, value) => mutations.push(() => records.set(reference.path, { ...records.get(reference.path), ...value })),
        delete: (reference) => mutations.push(() => records.delete(reference.path)),
      });
      mutations.forEach((apply) => apply());
      return result;
    },
    getDocsFromServer: async (reference) => {
      assert.ok(records.has(resetPath), 'reads and deletes occur only after locking');
      reads.set(reference.name, (reads.get(reference.name) || 0) + 1);
      await onRead?.(reference.name, reads.get(reference.name));
      if (reference.name === failGroup) throw Object.assign(new Error('Read unavailable'), { code: 'unavailable' });
      const docs = [...records.keys()].filter((path) => path.split('/').at(-2) === reference.name).slice(0, reference.limit).map((path) => snapshot(ref(path)));
      return { docs, size: docs.length, empty: docs.length === 0 };
    },
    writeBatch: () => {
      const deletions = [];
      let heartbeat;
      return {
        update: (reference, value) => { assert.equal(reference.path, resetPath); heartbeat = value; },
        delete: (reference) => deletions.push(reference.path),
        commit: async () => {
          assert.ok(records.has(resetPath));
          assert.equal(heartbeat.runId, records.get(resetPath).runId);
          assert.ok(deletions.length <= 200);
          if (++commits === failBatch) throw new Error('Injected batch failure');
          sizes.push(deletions.length);
          records.set(resetPath, { ...records.get(resetPath), ...heartbeat });
          for (const path of deletions) { events.push(['delete', path]); records.delete(path); }
        },
      };
    },
  };
  const mocks = {
    'firebase/firestore': firestore,
    '@/firebase/config': { db: {}, firebaseConfig: { projectId: 'demo-reset' }, auth: { currentUser: { uid: 'admin', email: 'admin@example.com', getIdToken: async (force) => { assert.equal(force, true); events.push(['token']); } } } },
    '@/features/auth/services/user-role.service': { verifyAdminPassword: async (password) => { events.push(['password']); if (password !== 'correct') throw new Error('Wrong password'); } },
  };
  const service = load('src/features/settings/services/database-reset.service.ts', mocks);
  return { records, events, sizes, reads, service, mocks,
    clear: (confirmation = 'DELETE demo-reset', password = 'correct', progress) => service.clearCurrentDatabase(confirmation, password, progress),
    failRead: (name) => { failGroup = name; }, failCommit: (index) => { failBatch = index; },
    setAdmin: (value) => { admin = value; }, onRead: (callback) => { onRead = callback; },
  };
}

test('browser reset clears every ERP collection in bounded batches, including orphan nested payments', async () => {
  const fixture = database();
  for (const name of fixture.service.RESET_COLLECTIONS) fixture.records.set(`${name}/record`, {});
  for (let i = 0; i < 650; i++) fixture.records.set(`attendances/a${i}`, {});
  fixture.records.set('invoices/missing/payments/orphan', {});
  fixture.records.set('settings/old/settings/nested', {});
  const progress = [];
  const result = await fixture.clear(undefined, undefined, (message) => progress.push(message));
  assert.equal(result.success, true);
  assert.equal(result.projectId, 'demo-reset');
  assert.equal(fixture.records.size, 0);
  assert.ok(fixture.sizes.includes(200));
  assert.equal(result.deleted, 650 + fixture.service.RESET_COLLECTIONS.length + 2);
  assert.ok(fixture.events.some(([type, path]) => type === 'delete' && path === 'invoices/missing/payments/orphan'));
  assert.equal(fixture.events.at(-1)[1], 'user_roles/record');
  assert.equal(fixture.events[0][0], 'password');
  assert.equal(fixture.events[1][0], 'token');
  assert.match(progress.at(-1), /Verifying cleared/);
});

test('empty database succeeds, and unknown collections are explicitly outside the browser reset scope', async () => {
  const empty = database();
  assert.equal((await empty.clear()).deleted, 0);
  assert.equal(empty.records.size, 0);
  const unknown = database({ 'external-data/keep': {}, 'students/remove': {} });
  await unknown.clear();
  assert.equal(unknown.records.size, 1);
  assert.ok(unknown.records.has('external-data/keep'));
});

test('wrong confirmation, password, and non-admin access cannot delete any data', async () => {
  const fixture = database({ 'students/keep': {} });
  await assert.rejects(fixture.clear('DELETE production'), /exact confirmation/);
  assert.equal(fixture.events.length, 0);
  await assert.rejects(fixture.clear(undefined, 'wrong'), /Wrong password/);
  fixture.setAdmin(false);
  await assert.rejects(fixture.clear(), (error) => error.code === 'permission-denied');
  assert.equal(fixture.records.size, 1);
  assert.equal(fixture.events.filter(([type]) => type === 'delete').length, 0);
});

test('all collections are preflighted and an unavailable read never counts as empty', async () => {
  const fixture = database({ 'students/s1': {}, 'payments/p1': {} });
  fixture.failRead('user_roles');
  await assert.rejects(fixture.clear(), (error) => error.code === 'unavailable');
  assert.equal(fixture.events.filter(([type]) => type === 'delete').length, 0);
  assert.equal(fixture.records.get(resetPath).status, 'failed');
  fixture.failRead(undefined);
  await fixture.clear();
  assert.equal(fixture.records.size, 0);
});

test('failed batches preserve the pause and a confirmed retry deletes only remaining records', async () => {
  const fixture = database(Object.fromEntries(Array.from({ length: 450 }, (_, i) => [`students/s${i}`, {}])));
  fixture.failCommit(2);
  await assert.rejects(fixture.clear(), /Injected batch failure/);
  assert.equal(fixture.records.size, 251);
  assert.equal(fixture.records.get(resetPath).status, 'failed');
  fixture.failCommit(0);
  assert.equal((await fixture.clear()).deleted, 250);
  assert.equal(fixture.records.size, 0);
});

test('active reset is not stolen; crashed reset can be resumed after five minutes', async () => {
  const fixture = database({ 'students/s1': {}, [resetPath]: { mode: 'browser', requestedBy: 'other-admin', runId: 'other', status: 'running', updatedAt: { toMillis: () => Date.now() } } });
  await assert.rejects(fixture.clear(), /Another database reset/);
  assert.equal(fixture.records.get(resetPath).runId, 'other');
  fixture.records.get(resetPath).updatedAt = { toMillis: () => Date.now() - 6 * 60_000 };
  await fixture.clear();
  assert.equal(fixture.records.size, 0);
});

test('same-tab duplicate submissions are rejected while the first reset is running', async () => {
  const fixture = database({ 'students/s1': {} });
  let tested = false;
  fixture.onRead(async () => {
    if (!tested) { tested = true; await assert.rejects(fixture.clear(), /already running in this tab/); }
  });
  await fixture.clear();
  assert.equal(fixture.records.size, 0);
});

test('verification catches records recreated by a server and leaves the reset resumable', async () => {
  const fixture = database();
  fixture.onRead(async (name, count) => {
    if (name === 'students' && count === 3) fixture.records.set('students/late', {});
  });
  await assert.rejects(fixture.clear(), /Records remain in students/);
  assert.equal(fixture.records.get(resetPath).status, 'failed');
  fixture.onRead(undefined);
  await fixture.clear();
  assert.equal(fixture.records.size, 0);
});

test('quota, permission and network errors explain recovery without claiming success', () => {
  const fixture = database();
  const message = (code) => fixture.service.databaseResetErrorMessage(Object.assign(new Error('generic'), { code }));
  assert.match(message('resource-exhausted'), /quota/);
  assert.match(message('permission-denied'), /security rules/);
  assert.match(message('unavailable'), /five minutes/);
  assert.equal(fixture.service.databaseResetErrorMessage(new Error('Records remain')), 'Records remain');
});

test('reset UI explains browser scope and keeps project, password, and typed-confirmation controls', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { default: Panel } = load('src/features/settings/components/ClearDatabasePanel.tsx', {
    '@/firebase/config': { firebaseConfig: { projectId: 'demo-reset' }, firebaseEnvironment: 'demo' },
    '../services/database-reset.service': {},
  });
  const html = renderToStaticMarkup(React.createElement(Panel, { disabled: false, onBusyChange() {} }));
  assert.match(html, /DELETE demo-reset/);
  assert.match(html, /type="password"/);
  assert.match(html, /ERP-managed/);
  assert.match(html, /Collections added outside this ERP are not included/);
  assert.match(html, /type="submit" disabled=""/);
});

test('the initiating administrator role survives verification failures and is removed only with the final lock', async () => {
  const fixture = database({ 'user_roles/admin@example.com': { role: 'admin' }, 'students/s1': {} });
  let verifiedRole = false;
  fixture.onRead(async (name, count) => {
    if (name === 'user_roles' && count === 3) {
      verifiedRole = true;
      assert.ok(fixture.records.has('user_roles/admin@example.com'));
      throw new Error('Connection lost during final verification');
    }
  });
  await assert.rejects(fixture.clear(), /Connection lost/);
  assert.ok(verifiedRole);
  assert.ok(fixture.records.has('user_roles/admin@example.com'));
  fixture.onRead(undefined);
  await fixture.clear();
  assert.equal(fixture.records.size, 0);
});
