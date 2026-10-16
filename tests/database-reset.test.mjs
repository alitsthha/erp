import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
class HttpsError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
function load(file, mocks = {}) {
  const filename = path.join(root, file);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, Date, Error, console: { error() {} },
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
  }, { filename });
  return module.exports;
}
const service = load('functions/src/database-reset.ts', { 'firebase-functions/v2/https': { HttpsError } });
const lockPath = service.DATABASE_RESET_PATH;
const request = (overrides = {}) => ({
  auth: { uid: 'admin-user', token: { auth_time: Math.floor(Date.now() / 1000) } },
  data: { projectId: 'demo-reset', confirmation: 'DELETE demo-reset' }, ...overrides,
});
function database(initial = {}) {
  const records = new Map(Object.entries(initial));
  const deleted = [];
  let failPath;
  let beforeDelete;
  const doc = (value) => ({
    path: value, id: value.split('/').at(-1),
    get: async () => ({ exists: records.has(value), data: () => records.get(value) }),
    set: async (data) => records.set(value, data),
    delete: async () => { records.delete(value); deleted.push(value); },
    listCollections: async () => collections(value),
  });
  const collection = (value) => ({
    path: value, id: value.split('/').at(-1),
    listDocuments: async () => [...new Set([...records.keys()].filter((key) => key.startsWith(value + '/'))
      .map((key) => key.split('/').slice(0, value.split('/').length + 1).join('/')))].map(doc),
  });
  function collections(parent = '') {
    const depth = parent ? parent.split('/').length : 0;
    return [...new Set([...records.keys()].filter((key) => !parent || key.startsWith(parent + '/'))
      .filter((key) => key.split('/').length > depth + 1)
      .map((key) => key.split('/').slice(0, depth + 1).join('/')))].map(collection);
  }
  const db = {
    doc, collection, listCollections: async () => collections(),
    runTransaction: async (callback) => callback({ get: (ref) => ref.get(), set: (ref, data) => records.set(ref.path, data) }),
    recursiveDelete: async (ref) => {
      assert.ok(records.has(lockPath), 'writes must be paused before any deletion');
      await beforeDelete?.(ref);
      if (ref.path === failPath) throw new Error('Injected delete failure');
      for (const key of [...records.keys()]) if (key === ref.path || key.startsWith(ref.path + '/')) {
        records.delete(key); deleted.push(key);
      }
    },
  };
  return { db, records, deleted, fail: (value) => { failPath = value; }, beforeDelete: (callback) => { beforeDelete = callback; } };
}
const clear = (fixture, input = request(), admin = true) => service.clearFirestoreDatabase(fixture.db, 'demo-reset', input, async () => admin);

test('clears every collection, nested documents and orphan descendants, without leaving its reset marker', async () => {
  const fixture = database({
    'students/s1': {}, 'invoices/i1/payments/p1': {}, 'new-unknown-collection/missing/deep/doc': {},
    '_maintenance/other/subcollection/child': {}, [`${lockPath}/old/history`]: {}, 'user_roles/admin': {},
    ...Object.fromEntries(Array.from({ length: 650 }, (_, i) => [`attendances/a${i}`, { activityId: 'a1' }])),
  });
  const result = await clear(fixture);
  assert.equal(result.success, true);
  assert.equal(result.projectId, 'demo-reset');
  assert.equal(fixture.records.size, 0);
  assert.equal(fixture.deleted.at(-1), lockPath);
  assert.ok(fixture.deleted.includes('invoices/i1/payments/p1'));
  assert.ok(fixture.deleted.includes('new-unknown-collection/missing/deep/doc'));
});

test('an empty database clears successfully', async () => {
  const fixture = database();
  assert.equal((await clear(fixture)).success, true);
  assert.equal(fixture.records.size, 0);
});

test('rejects unauthenticated, non-admin, mismatched project and stale authentication before deleting anything', async () => {
  const fixture = database({ 'students/keep': {} });
  const rejects = (input, code, admin = true) => assert.rejects(clear(fixture, input, admin), (error) => error.code === code);
  await rejects(request({ auth: undefined }), 'unauthenticated');
  await rejects(request(), 'permission-denied', false);
  await rejects(request({ data: { projectId: 'production', confirmation: 'DELETE production' } }), 'invalid-argument');
  await rejects(request({ data: { projectId: 'demo-reset', confirmation: 'DELETE' } }), 'invalid-argument');
  await rejects(request({ auth: { uid: 'admin', token: { auth_time: 0 } } }), 'failed-precondition');
  await rejects(request({ auth: { uid: 'admin', token: {} } }), 'failed-precondition');
  await assert.rejects(service.clearFirestoreDatabase(fixture.db, '', request(), async () => true), (error) => error.code === 'failed-precondition');
  assert.equal(fixture.deleted.length, 0);
  assert.equal(fixture.records.size, 1);
});

test('only one reset runs at a time, and other callable writes are blocked during it', async () => {
  const fixture = database({ 'students/s1': {} });
  fixture.beforeDelete(async () => {
    await assert.rejects(clear(fixture), (error) => error.code === 'already-exists');
    await assert.rejects(service.assertDatabaseAvailable(fixture.db), (error) => error.code === 'failed-precondition');
  });
  await clear(fixture);
  await service.assertDatabaseAvailable(fixture.db);
});

test('partial failures leave writes paused and allow the initiating admin to retry after their role record is gone', async () => {
  const fixture = database({ 'user_roles/admin': {}, 'students/s1': {}, 'attendances/a1': {} });
  fixture.fail('students');
  await assert.rejects(clear(fixture), (error) => error.code === 'internal');
  assert.equal(fixture.records.get(lockPath).status, 'failed');
  assert.equal(fixture.records.has('user_roles/admin'), false);
  await assert.rejects(service.assertDatabaseAvailable(fixture.db));
  await assert.rejects(clear(fixture, request({ auth: { uid: 'unrelated', token: request().auth.token } }), false), (error) => error.code === 'permission-denied');
  fixture.fail(undefined);
  assert.equal((await clear(fixture, request(), false)).success, true);
  assert.equal(fixture.records.size, 0);
});

test('a terminated reset can be retried after its execution lease expires', async () => {
  const fixture = database({ 'students/s1': {}, [lockPath]: { requestedBy: 'admin-user', status: 'running', startedAtMs: Date.now() - 11 * 60_000 } });
  await clear(fixture, request(), false);
  assert.equal(fixture.records.size, 0);
});

test('records recreated by another server writer prevent a false success response', async () => {
  const fixture = database({ 'students/s1': {} });
  fixture.beforeDelete(async () => fixture.records.set('unexpected/new', {}));
  await assert.rejects(clear(fixture), (error) => error.code === 'internal');
  assert.equal(fixture.records.get(lockPath).status, 'failed');
  fixture.beforeDelete(undefined);
  await clear(fixture);
  assert.equal(fixture.records.size, 0);
});

test('client requires confirmation, reauthenticates, refreshes the token, and sends only the configured project', async () => {
  const calls = [];
  const client = load('src/features/settings/services/database-reset.service.ts', {
    '@/firebase/config': { firebaseConfig: { projectId: 'demo-reset' }, functions: {}, auth: { currentUser: { getIdToken: async (force) => { calls.push(['token', force]); } } } },
    '@/features/auth/services/user-role.service': { verifyAdminPassword: async (password) => { assert.equal(password, 'password'); calls.push(['reauth']); } },
    'firebase/functions': { httpsCallable: (_functions, name, options) => async (data) => {
      calls.push(['call', name, data]);
      assert.equal(options.timeout, 540_000);
      assert.equal(data.password, undefined);
      return { data: { success: true, projectId: 'demo-reset', collectionsCleared: 3 } };
    } },
  });
  await assert.rejects(client.clearCurrentDatabase('DELETE wrong-project', 'password'));
  assert.equal(calls.length, 0);
  assert.equal((await client.clearCurrentDatabase('DELETE demo-reset', 'password')).success, true);
  assert.deepEqual(calls.map((call) => call[0]), ['reauth', 'token', 'call']);
  assert.equal(calls[1][1], true);
  assert.equal(calls[2][1], 'clearDatabase');
  assert.equal(calls[2][2].projectId, 'demo-reset');
});

test('clear database panel displays target, destructive scope, password and typed-confirmation controls', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { default: Panel } = load('src/features/settings/components/ClearDatabasePanel.tsx', {
    '@/firebase/config': { firebaseConfig: { projectId: 'demo-reset' }, firebaseEnvironment: 'demo' },
    '../services/database-reset.service': { clearCurrentDatabase: async () => { throw new Error('must not run during rendering'); } },
  });
  const html = renderToStaticMarkup(React.createElement(Panel, { disabled: false, onBusyChange() {} }));
  assert.match(html, /Connected project:/);
  assert.match(html, /DELETE demo-reset/);
  assert.match(html, /type="password"/);
  assert.match(html, /Permanently clear database/);
  assert.match(html, /nested collections/);
  assert.match(html, /Firebase login accounts and uploaded files remain/);
  assert.match(html, /type="submit" disabled=""/);
});

test('missing callable and CORS failures have actionable messages without hiding partial deletion errors', () => {
  const { databaseResetErrorMessage } = load('src/features/settings/services/database-reset.service.ts', {
    'firebase/functions': {}, '@/firebase/config': {}, '@/features/auth/services/user-role.service': {},
  });
  const error = (code, message) => Object.assign(new Error(message), { code });
  assert.match(databaseResetErrorMessage(error('functions/internal', 'internal')), /not be deployed or accessible/);
  assert.match(databaseResetErrorMessage(error('functions/internal', 'INTERNAL')), /not be deployed or accessible/);
  assert.match(databaseResetErrorMessage(error('functions/not-found', 'NOT FOUND')), /deploy/);
  assert.match(databaseResetErrorMessage(error('functions/deadline-exceeded', 'deadline-exceeded')), /may still be running/);
  const partial = 'The database was only partially cleared. Writes remain paused.';
  assert.equal(databaseResetErrorMessage(error('functions/internal', partial)), partial);
  assert.equal(databaseResetErrorMessage(error('functions/permission-denied', 'Only administrators can clear the database.')), 'Only administrators can clear the database.');
});
