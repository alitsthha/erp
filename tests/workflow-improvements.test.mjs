import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
function load(file, mocks = {}, globals = {}, cache = new Map()) {
  const filename = path.resolve(root, file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const localRequire = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (specifier.startsWith('.') || specifier.startsWith('@/')) {
      const target = specifier.startsWith('@/') ? path.join(root, 'src', specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
      return load(existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`, mocks, globals, cache);
    }
    return require(specifier);
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, console, Date, Error, ...globals }, { filename });
  return module.exports;
}

function formHarness(onSubmit, confirm = () => true) {
  const entries = new Map();
  const stateUpdates = [];
  const react = {
    useContext: () => entries,
    useId: () => 'test-form',
    useRef: (value) => ({ current: value }),
    useState: (value) => [value, (next) => stateUpdates.push(next)],
    useEffect: (effect) => effect(),
  };
  const { default: SafeForm } = load('src/components/forms/SafeForm.tsx', {
    react, './form-safety-context': { FormSafetyContext: {} },
  }, { window: { confirm } });
  return { form: SafeForm({ onSubmit }).props, entries, stateUpdates };
}
const event = () => ({ preventDefault() {} });

test('forms preserve unsaved state after a failed save and expose an inline error', async () => {
  const h = formHarness(async () => { throw new Error('Permission denied'); });
  h.form.onChangeCapture({});
  await h.form.onSubmit(event());
  assert.equal(h.entries.get('test-form').dirty, true);
  assert.equal(h.entries.get('test-form').saving, false);
  assert.ok(h.stateUpdates.includes('Permission denied'));
});

test('rapid double submission produces only one save and always releases its lock', async () => {
  let finish;
  const gate = new Promise((resolve) => { finish = resolve; });
  let calls = 0;
  const h = formHarness(async () => { calls++; await gate; });
  h.form.onChangeCapture({});
  const first = h.form.onSubmit(event());
  await h.form.onSubmit(event());
  assert.equal(calls, 1);
  assert.equal(h.entries.get('test-form').saving, true);
  finish();
  await first;
  assert.equal(h.entries.get('test-form').saving, false);
});

test('cancel preserves edits when discard is declined', () => {
  const h = formHarness(async () => {}, () => false);
  h.form.onInputCapture({});
  let prevented = false;
  h.form.onClickCapture({ target: { closest: () => ({ type: 'button', textContent: 'Cancel' }) },
    preventDefault: () => { prevented = true; }, stopPropagation() {} });
  assert.equal(prevented, true);
  assert.equal(h.entries.get('test-form').dirty, true);
  h.form.onReset();
  assert.equal(h.entries.get('test-form').dirty, false);
});

test('list preferences survive remount and functional updates without storing form data', () => {
  const storage = new Map();
  const sessionStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  const react = {
    useState: (initial) => {
      let value = typeof initial === 'function' ? initial() : initial;
      return [value, (next) => { value = typeof next === 'function' ? next(value) : next; }];
    },
    useCallback: (callback) => callback,
  };
  const { useSessionState } = load('src/hooks/useSessionState.ts', { react }, { sessionStorage });
  const [initial, setPage] = useSessionState('students:page', 1);
  assert.equal(initial, 1);
  setPage(3);
  setPage((page) => page + 1);
  assert.equal(useSessionState('students:page', 1)[0], 4);
  assert.deepEqual([...storage.keys()], ['erp:ui:students:page']);
  storage.clear();
  assert.equal(useSessionState('students:page', 1)[0], 1);
});

test('session warning appears only during the final two minutes and never extends expiry', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const now = 1_000_000;
  for (const [seconds, expected] of [[121, false], [120, true], [30, true], [0, false]]) {
    const { default: Notice } = load('src/components/common/SessionExpiryNotice.tsx', {
      '@/app/providers/AuthProvider': { useAuth: () => ({ sessionExpiresAt: now + seconds * 1000 }) },
    }, { Date: { now: () => now } });
    const html = renderToStaticMarkup(React.createElement(Notice));
    assert.equal(html.includes('Save your work'), expected);
  }
});

test('student shortcuts carry the exact student identity and respect finance permissions', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  for (const isAdmin of [false, true]) {
    const { default: Actions } = load('src/components/common/StudentQuickActions.tsx', {
      '@/app/providers/AuthProvider': { useAuth: () => ({ isAdmin, permissions: { attendance: true } }) },
      'react-router-dom': { Link: ({ to, children, ...props }) => React.createElement('a', { ...props, href: to }, children) },
    }, { URLSearchParams });
    const html = renderToStaticMarkup(React.createElement(Actions, { studentId: 'student /42' }));
    assert.ok(html.includes('studentId=student+%2F42'));
    assert.equal(html.includes('Create bill'), isAdmin);
    assert.equal(html.includes('Record payment'), isAdmin);
    assert.ok(html.includes('Record attendance'));
  }
});

test('navigation safety and forms render together inside the data router', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { createMemoryRouter, RouterProvider } = require('react-router-dom');
  const { default: Provider } = load('src/components/forms/FormSafetyProvider.tsx', {
    '@/app/providers/AuthProvider': { useAuth: () => ({ user: { uid: 'admin' } }) },
  });
  const router = createMemoryRouter([{ path: '/', element: React.createElement(Provider, null, React.createElement('p', null, 'Ready')) }]);
  const html = renderToStaticMarkup(React.createElement(RouterProvider, { router }));
  assert.ok(html.includes('Ready'));
  router.dispose();
});
