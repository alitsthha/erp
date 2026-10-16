import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function harness(create) {
  class DuplicateEnrollmentError extends Error {}
  const calls = [];
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL('../src/features/enrollments/services/bulk-enrollment.service.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Error,
    require: () => ({ DuplicateEnrollmentError, addEnrollment: async (data) => {
      calls.push(data);
      return create?.(data, DuplicateEnrollmentError);
    } }),
  });
  return { ...module.exports, calls };
}

test('bulk enrollment creates each distinct student/activity pair with configured pricing and shared date', async () => {
  const h = harness();
  const progress = [];
  const results = await h.bulkEnrollStudents(['s1', 's2', 's1'], ['a1', 'a2', 'a1'], '2083-06-30', (value) => progress.push(value));
  assert.equal(results.length, 4);
  assert.deepEqual(progress, [1, 2, 3, 4]);
  assert.deepEqual(h.calls.map((data) => `${data.studentId}:${data.activityId}`), ['s1:a1', 's1:a2', 's2:a1', 's2:a2']);
  assert.ok(h.calls.every((data) => data.enrollmentDate === '2083-06-30' && data.status === 'Active' && data.sessionFee === ''));
});

test('duplicates and write failures are reported individually without preventing remaining enrollments', async () => {
  const h = harness((data, DuplicateError) => {
    if (data.studentId === 'duplicate') throw new DuplicateError();
    if (data.studentId === 'failed') throw new Error('Permission denied');
  });
  const results = await h.bulkEnrollStudents(['duplicate', 'failed', 'valid'], ['a1'], '2083-06-30');
  assert.equal(results[0].status, 'skipped');
  assert.equal(results[1].status, 'failed');
  assert.equal(results[1].message, 'Permission denied');
  assert.equal(results[2].status, 'created');
});

test('invalid bulk requests never write enrollments', async () => {
  const h = harness();
  for (const [students, activities, date] of [[[], ['a1'], '2083-06-30'], [['s1'], [], '2083-06-30'], [['s1'], ['a1'], '']]) {
    await assert.rejects(h.bulkEnrollStudents(students, activities, date));
  }
  assert.equal(h.calls.length, 0);
});
