import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function sessionHarness() {
  let now = Date.parse('2026-10-13T10:00:00Z');
  let nextId = 0;
  const timers = new Map();
  const windowEvents = new Map();
  const documentEvents = new Map();
  const eventTarget = (listeners) => ({
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
  });
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL('../src/lib/auth-session.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    Date: { now: () => now, parse: Date.parse },
    window: {
      ...eventTarget(windowEvents),
      setTimeout: (callback, delay) => {
        const id = ++nextId;
        timers.set(id, { callback, at: now + delay });
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
    },
    document: eventTarget(documentEvents),
  });
  return {
    ...module.exports, timers, windowEvents, documentEvents,
    advance: (milliseconds) => { now += milliseconds; },
    runTimers: () => {
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now) {
          timers.delete(id);
          timer.callback();
        }
      }
    },
  };
}

test('session expires exactly 30 minutes after authentication, only once', () => {
  const h = sessionHarness();
  let expired = 0;
  h.watchSessionExpiry(h.getSessionExpiresAt('2026-10-13T10:00:00Z'), () => expired++);
  h.advance(30 * 60 * 1000 - 1);
  h.runTimers();
  assert.equal(expired, 0);
  h.advance(1);
  h.runTimers();
  h.runTimers();
  assert.equal(expired, 1);
  assert.equal(h.timers.size + h.windowEvents.size + h.documentEvents.size, 0);
});

test('restoring a session after a refresh preserves the original expiry', () => {
  const h = sessionHarness();
  let expired = false;
  h.advance(20 * 60 * 1000);
  h.watchSessionExpiry(h.getSessionExpiresAt('2026-10-13T10:00:00Z'), () => { expired = true; });
  h.advance(10 * 60 * 1000);
  h.runTimers();
  assert.equal(expired, true);
});

for (const event of ['focus', 'pageshow', 'visibilitychange']) {
  test(`returning via ${event} expires a session even if the browser suspended timers`, () => {
    const h = sessionHarness();
    let expired = false;
    h.watchSessionExpiry(h.getSessionExpiresAt('2026-10-13T10:00:00Z'), () => { expired = true; });
    h.advance(31 * 60 * 1000);
    (h.windowEvents.get(event) ?? h.documentEvents.get(event))();
    assert.equal(expired, true);
  });
}

test('already expired or invalid authentication times expire immediately', () => {
  for (const authTime of ['2026-10-13T09:00:00Z', 'invalid']) {
    const h = sessionHarness();
    let expired = false;
    h.watchSessionExpiry(h.getSessionExpiresAt(authTime), () => { expired = true; });
    assert.equal(expired, true);
    assert.equal(h.timers.size, 0);
  }
});

test('cleanup prevents an old session timer from logging out a new login', () => {
  const h = sessionHarness();
  let expired = false;
  const stop = h.watchSessionExpiry(h.getSessionExpiresAt('2026-10-13T10:00:00Z'), () => { expired = true; });
  stop();
  h.advance(31 * 60 * 1000);
  h.runTimers();
  assert.equal(expired, false);
  assert.equal(h.timers.size + h.windowEvents.size + h.documentEvents.size, 0);
});
