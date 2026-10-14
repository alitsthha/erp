import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { loadEnv, resolveConfig } from 'vite';

const filename = new URL('../src/firebase/environment.ts', import.meta.url);
const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(code, { module, exports: module.exports, Error });
const { resolveFirebaseEnvironment } = module.exports;
const env = (target, project) => ({
  VITE_FIREBASE_ENVIRONMENT: target,
  VITE_FIREBASE_API_KEY: `test-api-key-${project}`,
  VITE_FIREBASE_AUTH_DOMAIN: `${project}.firebaseapp.com`,
  VITE_FIREBASE_PROJECT_ID: project,
  VITE_FIREBASE_STORAGE_BUCKET: `${project}.firebasestorage.app`,
  VITE_FIREBASE_MESSAGING_SENDER_ID: '12345',
  VITE_FIREBASE_APP_ID: `1:12345:web:${project}`,
});

test('Vite development and production load different project configurations', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'erp-firebase-env-'));
  for (const [mode, config] of [['development', env('demo', 'test-demo')], ['production', env('production', 'test-production')]]) {
    writeFileSync(path.join(directory, `.env.${mode}.local`), Object.entries(config).map(([key, value]) => `${key}=${value}`).join('\n'));
  }
  const demo = resolveFirebaseEnvironment(loadEnv('development', directory, 'VITE_FIREBASE_'), 'development');
  const production = resolveFirebaseEnvironment(loadEnv('production', directory, 'VITE_FIREBASE_'), 'production');
  assert.equal(demo.config.projectId, 'test-demo');
  assert.equal(demo.target, 'demo');
  assert.equal(production.config.projectId, 'test-production');
  assert.equal(production.target, 'production');
});

test('development cannot silently use the production configuration', () => {
  assert.throws(() => resolveFirebaseEnvironment(env('production', 'production-project'), 'development'), /ENVIRONMENT=demo/);
  assert.throws(() => resolveFirebaseEnvironment({}, 'development'), /will not fall back/);
});

test('production cannot silently use the demo configuration', () => {
  assert.throws(() => resolveFirebaseEnvironment(env('demo', 'demo-project'), 'production'), /ENVIRONMENT=production/);
  assert.throws(() => resolveFirebaseEnvironment({}, 'production'), /will not fall back/);
});

test('all web app fields must be supplied rather than placeholders', () => {
  for (const key of Object.keys(env('demo', 'demo-project')).filter((key) => key !== 'VITE_FIREBASE_ENVIRONMENT')) {
    for (const value of ['', '  ', 'YOUR_DEMO_VALUE']) {
      assert.throws(() => resolveFirebaseEnvironment({ ...env('demo', 'demo-project'), [key]: value }, 'development'), new RegExp(key));
    }
  }
});

test('custom modes cannot unexpectedly select a live project', () => {
  assert.throws(() => resolveFirebaseEnvironment(env('production', 'production-project'), 'staging'), /Unsupported Firebase mode/);
});

test('project-level Vite configuration rejects a shared demo/production project', async () => {
  const original = Object.fromEntries(Object.keys(env('demo', 'same-project')).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env('demo', 'same-project'));
  try {
    await assert.rejects(resolveConfig({ mode: 'development' }, 'serve'), /different Firebase project IDs/);
  } finally {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
