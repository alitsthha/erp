import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');

// Exercise the actual TypeScript services with an isolated Firestore double.
function loadModule(file, mocks = {}, cache = new Map()) {
  const filename = path.resolve(root, file);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const localRequire = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    if (specifier.endsWith(".css")) return {};
    if (specifier.startsWith('.') || specifier.startsWith('@/')) {
      const target = specifier.startsWith('@/')
        ? path.join(root, 'src', specifier.slice(2))
        : path.resolve(path.dirname(filename), specifier);
      return loadModule(existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`, mocks, cache);
    }
    return require(specifier);
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, console, Error, Date, URLSearchParams }, { filename });
  return module.exports;
}

const { studentSchema } = loadModule('src/features/students/schemas/student.schema.ts');
const studentData = {
  fullName: '  test   user this ', guardianName: 'TEST GUARDIAN',
  guardianPhone: '9812345678', guardianEmail: '', status: 'Active', joiningDateBS: '2083-06-25',
};

test('student and guardian names normalize any number of words', () => {
  const data = studentSchema.parse({ ...studentData, parentName: 'test parent name' });
  assert.equal(data.fullName, 'Test User This');
  assert.equal(data.guardianName, 'Test Guardian');
  assert.equal(data.parentName, 'Test Parent Name');
  assert.equal(studentSchema.safeParse({ ...studentData, fullName: '   ' }).success, false);
});

test('contacts require exactly ten ASCII digits starting with 98', () => {
  for (const guardianPhone of ['9812345678', '9800000000', '9899999999']) {
    assert.equal(studentSchema.safeParse({ ...studentData, guardianPhone }).success, true);
  }
  for (const guardianPhone of ['', '981234567', '98123456789', '9712345678', '98abcdefgh', '+9779812345678', '98 2345678']) {
    assert.equal(studentSchema.safeParse({ ...studentData, guardianPhone }).success, false, guardianPhone);
  }
  assert.equal(studentSchema.safeParse({ ...studentData, parentPhone: '' }).success, true);
  assert.equal(studentSchema.safeParse({ ...studentData, parentPhone: '9712345678' }).success, false);
});

function database(initial = {}, callableError = null) {
  const data = new Map(Object.entries(initial));
  let sequence = 0;
  let writes = 0;
  const deletedField = Symbol('deleteField');
  const merge = (existing, patch) => Object.fromEntries(Object.entries({ ...existing, ...patch }).filter(([, value]) => value !== deletedField));
  const ref = (value) => ({ path: value, id: value.split('/').at(-1) });
  const snapshot = (reference) => ({ ...reference, ref: reference, exists: () => data.has(reference.path), data: () => data.get(reference.path) });
  const firestore = {
    collection: (_db, ...parts) => ref(parts.join('/')),
    doc: (parent, ...parts) => ref(parts.length ? parts.join('/') : `${parent.path}/generated-${++sequence}`),
    where: (field, op, value) => ({ field, op, value }),
    query: (reference, ...filters) => ({ ...reference, filters }),
    orderBy: () => ({}),
    getDocs: async (reference) => ({ docs: Array.from(data.keys())
      .filter((key) => key.startsWith(`${reference.path}/`) && key.split('/').length === reference.path.split('/').length + 1)
      .filter((key) => (reference.filters ?? []).every(({ field, value }) => !field || data.get(key)[field] === value))
      .map((key) => snapshot(ref(key))) }),
    getDoc: async (reference) => snapshot(reference),
    getDocFromServer: async (reference) => snapshot(reference),
    serverTimestamp: () => 'server-time',
    deleteField: () => deletedField,
    Timestamp: { now: () => 'client-time' },
    addDoc: async (parent, value) => {
      const reference = ref(`${parent.path}/generated-${++sequence}`);
      data.set(reference.path, value); writes++;
      return reference;
    },
    updateDoc: async (reference, value) => { data.set(reference.path, merge(data.get(reference.path), value)); writes++; },
    setDoc: async (reference, value, options) => { data.set(reference.path, options?.merge ? merge(data.get(reference.path), value) : value); writes++; },
    writeBatch: () => {
      const removals = [];
      return { delete: (reference) => removals.push(reference.path), commit: async () => { removals.forEach((key) => data.delete(key)); writes += removals.length; } };
    },
    runTransaction: async (_db, callback) => {
      const mutations = [];
      const result = await callback({
        get: async (reference) => snapshot(reference),
        set: (reference, value) => mutations.push(() => data.set(reference.path, value)),
        update: (reference, value) => mutations.push(() => data.set(reference.path, merge(data.get(reference.path), value))),
        delete: (reference) => mutations.push(() => data.delete(reference.path)),
      });
      mutations.forEach((mutation) => mutation()); writes += mutations.length;
      return result;
    },
  };
  firestore.getDocsFromServer = firestore.getDocs;
  return { data, get writes() { return writes; }, mocks: {
    'firebase/firestore': firestore,
    'firebase/functions': { httpsCallable: () => async () => { if (callableError) throw callableError; } },
    '@/firebase/config': { db: {}, functions: {} },
    './enrollment-code.service': { generateEnrollmentCode: async () => 'EN0001' },
    './student-code.service': { generateStudentCode: async () => 'ST0001' },
    '@/features/attendance/services/attendance-code.service': { generateAttendanceCode: async () => 'AT0001' },
  } };
}

test('student saves validate contacts before any database write', async () => {
  const db = database();
  const service = loadModule('src/features/students/services/student.service.ts', db.mocks);
  await assert.rejects(service.addStudent({ ...studentData, guardianPhone: '9712345678' }));
  await assert.rejects(service.updateStudent('s1', { guardianPhone: '981' }));
  assert.equal(db.writes, 0);
  const id = await service.addStudent(studentData);
  assert.equal(db.data.get(`students/${id}`).fullName, 'Test User This');
});

test('duplicate enrollment returns the existing record without creating another', async () => {
  const db = database({ 'enrollments/e1': { studentId: 's1', activityId: 'a1', status: 'Active' } });
  const service = loadModule('src/features/enrollments/services/enrollment.service.ts', db.mocks);
  await assert.rejects(service.addEnrollment({ studentId: 's1', activityId: 'a1' }), (error) => {
    assert.ok(error instanceof service.DuplicateEnrollmentError);
    assert.equal(error.enrollment.id, 'e1');
    return true;
  });
  assert.equal(db.writes, 0);
});

test('editing the existing enrollment does not flag itself as a duplicate', async () => {
  const db = database({
    'enrollments/e1': { studentId: 's1', activityId: 'a1', status: 'Active' },
    'students/s1': { fullName: 'Test User' }, 'activities/a1': { activityName: 'Music' },
  });
  const service = loadModule('src/features/enrollments/services/enrollment.service.ts', db.mocks);
  await service.updateEnrollment('e1', { studentId: 's1', activityId: 'a1', enrollmentDate: '2083-06-25', status: 'Active' });
  assert.equal(db.writes, 1);
});

test('inactive enrollment also returns the existing record for review', async () => {
  const db = database({ 'enrollments/e1': { studentId: 's1', activityId: 'a1', status: 'Inactive' } });
  const service = loadModule('src/features/enrollments/services/enrollment.service.ts', db.mocks);
  await assert.rejects(service.addEnrollment({ studentId: 's1', activityId: 'a1' }), (error) => {
    assert.equal(error.enrollment.status, 'Inactive');
    return true;
  });
  assert.equal(db.writes, 0);
});

test('unavailable callable falls back to cascade deletion and repairs daily totals', async () => {
  const deleted = { studentId: 's1', activityId: 'a1', status: 'Present', sessionFee: 100 };
  const retained = { studentId: 's2', activityId: 'a1', status: 'Absent', sessionFee: 100 };
  const db = database({
    'students/s1': {}, 'students/s2': {},
    'enrollments/e1': { studentId: 's1' }, 'attendances/at1': deleted,
    'daily_attendances/day1': { attendances: [deleted, retained] },
    'daily_attendances/day2': { attendances: [deleted] },
  }, { code: 'functions/internal' });
  const service = loadModule('src/features/students/services/student-delete.service.ts', db.mocks);
  await service.deleteStudent('s1');
  for (const key of ['students/s1', 'enrollments/e1', 'attendances/at1', 'daily_attendances/day2']) assert.equal(db.data.has(key), false, key);
  assert.equal(db.data.has('students/s2'), true);
  assert.equal(db.data.get('daily_attendances/day1').totalRecords, 1);
  assert.equal(db.data.get('daily_attendances/day1').presentCount, 0);
  assert.equal(db.data.get('daily_attendances/day1').totalSessionFees, 0);
});

test('permission denial does not fall back or delete data', async () => {
  const db = database({ 'students/s1': {} }, { code: 'functions/permission-denied' });
  const service = loadModule('src/features/students/services/student-delete.service.ts', db.mocks);
  await assert.rejects(service.deleteStudent('s1'));
  assert.equal(db.writes, 0);
  assert.equal(db.data.has('students/s1'), true);
});

test('fallback reverses linked accounting balances before deleting payments', async () => {
  const db = database({
    'students/s1': {}, 'financePayments/p1': { studentId: 's1' },
    'accountingPostings/p1': { journalEntryId: 'j1' },
    'journalEntries/j1': { lines: [{ accountId: 'cash', debit: 100, credit: 0 }, { accountId: 'income', debit: 0, credit: 100 }], totalDebit: 100, totalCredit: 100 },
    'accounts/cash': { accountType: 'Asset', currentBalance: 250 },
    'accounts/income': { accountType: 'Income', currentBalance: 250 },
  }, { code: 'functions/not-found' });
  const service = loadModule('src/features/students/services/student-delete.service.ts', db.mocks);
  await service.deleteStudent('s1');
  assert.equal(db.data.get('accounts/cash').currentBalance, 150);
  assert.equal(db.data.get('accounts/income').currentBalance, 150);
  assert.equal(db.data.get('journalEntries/j1').status, 'Reversed');
  assert.equal(db.data.has('financePayments/p1'), false);
  await service.deleteStudent('s1');
  assert.equal(db.data.get('accounts/cash').currentBalance, 150);
});

test('a broken financial reference leaves student and dependent records intact', async () => {
  const db = database({
    'students/s1': {}, 'enrollments/e1': { studentId: 's1' },
    'financePayments/p1': { studentId: 's1' },
    'accountingPostings/p1': { journalEntryId: 'missing' },
  }, { code: 'functions/unavailable' });
  const service = loadModule('src/features/students/services/student-delete.service.ts', db.mocks);
  await assert.rejects(service.deleteStudent('s1'), /linked accounting journal/);
  assert.equal(db.writes, 0);
  assert.equal(db.data.has('students/s1'), true);
  assert.equal(db.data.has('enrollments/e1'), true);
  assert.equal(db.data.has('financePayments/p1'), true);
});

test('unpaid and partly paid invoices block deletion before any mutation', async () => {
  for (const invoice of [
    { totalAmount: 100, paidAmount: 0, dueAmount: 100, status: 'Unpaid' },
    { totalAmount: 100, paidAmount: 60, dueAmount: 40, status: 'Partially Paid' },
    { totalAmount: 100, paidAmount: 0, dueAmount: 0, status: 'Paid' },
  ]) {
    const db = database({ 'students/s1': {}, 'enrollments/e1': { studentId: 's1' }, 'invoices/i1': { ...invoice, studentId: 's1' } }, { code: 'functions/internal' });
    const service = loadModule('src/features/students/services/student-delete.service.ts', db.mocks);
    await assert.rejects(service.deleteStudent('s1'), /Clear all payments first/);
    assert.equal(db.writes, 0);
    assert.equal(db.data.has('students/s1'), true);
    assert.equal(db.data.has('enrollments/e1'), true);
  }
});

test('deletion review includes only the selected student enrollments and open invoice balances', async () => {
  const db = database({
    'enrollments/e1': { studentId: 's1', activityName: 'Music', status: 'Active' },
    'enrollments/e2': { studentId: 's1', activityName: 'Art', status: 'Inactive' },
    'enrollments/e3': { studentId: 's2', activityName: 'Dance' },
    'invoices/i1': { studentId: 's1', totalAmount: 100, paidAmount: 40, dueAmount: 60, invoiceNumber: 'INV1' },
    'invoices/i2': { studentId: 's1', totalAmount: 100, paidAmount: 100, dueAmount: 0, status: 'Paid' },
    'invoices/i3': { studentId: 's1', totalAmount: 100, paidAmount: 0, dueAmount: 100, status: 'Cancelled' },
    'invoices/i4': { studentId: 's2', totalAmount: 500, paidAmount: 0, dueAmount: 500 },
  });
  const service = loadModule('src/features/students/services/student-deletion-review.service.ts', db.mocks);
  const review = await service.getStudentDeletionReview('s1');
  assert.equal(review.enrollments.length, 2);
  assert.equal(review.enrollments[0].activityName, 'Art');
  assert.equal(review.unpaidInvoices.length, 1);
  assert.equal(review.outstandingAmount, 60);
});

test('settled invoices permit deletion; malformed balances fail closed', async () => {
  const paidDb = database({ 'students/s1': {}, 'invoices/i1': { studentId: 's1', totalAmount: 100, paidAmount: 100, dueAmount: 0 } }, { code: 'functions/internal' });
  await loadModule('src/features/students/services/student-delete.service.ts', paidDb.mocks).deleteStudent('s1');
  assert.equal(paidDb.data.has('students/s1'), false);
  const invalidDb = database({ 'students/s1': {}, 'invoices/i1': { studentId: 's1', totalAmount: 'invalid', paidAmount: 100 } });
  await assert.rejects(loadModule('src/features/students/services/student-delete.service.ts', invalidDb.mocks).deleteStudent('s1'), /Cannot verify payment clearance/);
  assert.equal(invalidDb.writes, 0);
});

test('pagination shows ten records per page and clamps after deletion', () => {
  const { getPage } = loadModule('src/utils/pagination.ts');
  const rows = Array.from({ length: 25 }, (_, id) => ({ id }));
  const first = getPage(rows, 1);
  assert.equal(first.items.length, 10);
  assert.equal(first.totalPages, 3);
  assert.equal(getPage(rows, 2).items[0].id, 10);
  assert.equal(getPage(rows, 3).items.length, 5);
  assert.equal(getPage(rows.slice(0, 10), 3).page, 1);
  assert.equal(getPage([], 9).items.length, 0);
  assert.equal(getPage([], 9).totalPages, 1);
  assert.equal(getPage(rows, -1).page, 1);
});

test('payment clearance is rechecked after the dialog review', async () => {
  const db = database({ 'students/s1': {}, 'invoices/i1': { studentId: 's1', totalAmount: 100, paidAmount: 100, dueAmount: 0 } });
  const review = await loadModule('src/features/students/services/student-deletion-review.service.ts', db.mocks).getStudentDeletionReview('s1');
  assert.equal(review.outstandingAmount, 0);
  db.data.set('invoices/i1', { studentId: 's1', totalAmount: 150, paidAmount: 100, dueAmount: 50 });
  await assert.rejects(loadModule('src/features/students/services/student-delete.service.ts', db.mocks).deleteStudent('s1'), /Clear all payments first/);
  assert.equal(db.writes, 0);
});

test('cloud deletion rejects outstanding balances before constructing a write batch', async () => {
  class HttpsError extends Error {
    constructor(code, message) { super(message); this.code = code; }
  }
  let batchCalls = 0;
  const db = {
    doc: () => ({ get: async () => ({ exists: false }) }),
    collection: (name) => ({
      doc: () => ({ get: async () => ({ exists: true }) }),
      where: () => ({ get: async () => ({ docs: name === 'invoices' ? [{ id: 'i1', data: () => ({ totalAmount: 100, paidAmount: 25, dueAmount: 75 }) }] : [] }) }),
    }),
    batch: () => { batchCalls++; throw new Error('Must not reach deletion'); },
  };
  const server = loadModule('functions/src/index.ts', {
    'firebase-admin': { initializeApp: () => {}, firestore: () => db },
    'firebase-functions/v2/https': { onCall: (...args) => args.at(-1), HttpsError },
  });
  await assert.rejects(server.deleteStudentCascade({ data: { studentId: 's1' }, auth: { token: { admin: true } } }), (error) => {
    assert.equal(error.code, 'failed-precondition');
    assert.match(error.message, /75.00/);
    return true;
  });
  assert.equal(batchCalls, 0);
});

test('pagination renders ten rows and page totals with table-safe markup', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const PaginatedList = loadModule('src/components/common/PaginatedList.tsx').default;
  const rows = Array.from({ length: 21 }, (_, id) => ({ id }));
  const html = renderToStaticMarkup(React.createElement('table', null,
    React.createElement('tbody', null, React.createElement(PaginatedList, { items: rows, table: true },
      (row) => React.createElement('tr', { key: row.id, 'data-record': row.id }, React.createElement('td', null, row.id))))));
  assert.equal((html.match(/data-record=/g) || []).length, 10);
  assert.match(html, /Page 1 of 3/);
  assert.match(html, /<tr><td colSpan="99"[^>]*><nav/);
  assert.match(html, />Next<\/button>/);
  const listHtml = renderToStaticMarkup(React.createElement('ul', null,
    React.createElement(PaginatedList, { items: rows, list: true },
      (row) => React.createElement('li', { key: row.id, 'data-record': row.id }, row.id))));
  assert.equal((listHtml.match(/data-record=/g) || []).length, 10);
  assert.match(listHtml, /<li class="col-span-full w-full list-none"><nav/);
});

test('name sorting is case insensitive, numeric, stable, and leaves missing names last', () => {
  const { sortList } = loadModule('src/utils/list-sort.ts');
  const records = [
    { id: 0, fullName: 'Zara' }, { id: 1, fullName: 'test 10' },
    { id: 2, fullName: 'Test 2' }, { id: 3, fullName: 'amy' },
    { id: 4 }, { id: 5, fullName: 'Amy' },
  ];
  assert.equal(sortList(records, 'name-asc').map((item) => item.id).join(','), '3,5,2,1,0,4');
  assert.equal(sortList(records, 'name-desc').map((item) => item.id).join(','), '0,1,2,3,5,4');
  assert.equal(records.map((item) => item.id).join(','), '0,1,2,3,4,5');
  assert.equal(sortList(records, 'default').map((item) => item.id).join(','), '0,1,2,3,4,5');
});

test('date sorting normalizes BS dates, AD dates, and Firestore timestamps', () => {
  const { dateSortValue, sortList } = loadModule('src/utils/list-sort.ts');
  const NepaliDate = require('nepali-date-converter').default;
  const bs = new NepaliDate(new Date(2026, 9, 11));
  const bsDate = `${bs.getYear()}-${bs.getMonth() + 1}-${bs.getDate()}`;
  assert.equal(dateSortValue(bsDate, 'BS'), dateSortValue('2026-10-11'));
  const records = [
    { id: 'late', createdAt: { seconds: Date.UTC(2026, 9, 12) / 1000 } },
    { id: 'bs', sessionDateBS: bsDate },
    { id: 'early', invoiceDate: '2026-10-10' },
    { id: 'missing' },
  ];
  assert.equal(sortList(records, 'date-asc').map((item) => item.id).join(','), 'early,bs,late,missing');
  assert.equal(sortList(records, 'date-desc').map((item) => item.id).join(','), 'late,bs,early,missing');
  assert.equal(dateSortValue('2026-02-30'), null);
  assert.equal(dateSortValue('not a date'), null);
  assert.equal(dateSortValue({ seconds: Infinity }), null);
  assert.equal(dateSortValue(new Date('invalid')), null);
});

test('sort keys use the displayed record name and business date', () => {
  const { getSortName, getSortDate, dateSortValue } = loadModule('src/utils/list-sort.ts');
  assert.equal(getSortName({ staffName: 'Teacher A', role: 'Music' }), 'Teacher A');
  assert.equal(getSortName({ accountName: 'Cash' }), 'Cash');
  assert.equal(getSortName({ invoice: { studentName: 'Test Student' } }), 'Test Student');
  assert.equal(getSortDate({ invoice: { invoiceDate: '2026-10-01' } }), dateSortValue('2026-10-01'));
  assert.equal(getSortDate({ joiningDateBS: '', createdAt: { toMillis: () => 1234 } }), 1234);
});

test('page-level sort orders the full result set before the ten-record page', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const cache = new Map();
  const { ListSortContext } = loadModule('src/components/common/list-sort-context.ts', {}, cache);
  const PaginatedList = loadModule('src/components/common/PaginatedList.tsx', {}, cache).default;
  const rows = Array.from({ length: 21 }, (_, index) => ({ id: index, fullName: `Student ${21 - index}` }));
  const html = renderToStaticMarkup(React.createElement(ListSortContext.Provider, { value: { order: 'name-asc', setOrder: () => {} } },
    React.createElement(PaginatedList, { items: rows, showSort: false },
      (row) => React.createElement('div', { key: row.id, 'data-name': row.fullName }, row.fullName))));
  const names = Array.from(html.matchAll(/data-name="([^"]+)"/g), (match) => match[1]);
  assert.equal(names.length, 10);
  assert.equal(names[0], 'Student 1');
  assert.equal(names[9], 'Student 10');
  assert.match(html, /Page 1 of 3/);
});

test('shared toolbar places sorting between search and filter', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const Toolbar = loadModule('src/components/common/ListToolbar.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Toolbar, { search: '', onSearchChange: () => {}, filter: React.createElement('select', { 'aria-label': 'Status filter' }) }));
  assert.ok(html.indexOf('placeholder="Search records..."') < html.indexOf('aria-label="Sort records"'));
  assert.ok(html.indexOf('aria-label="Sort records"') < html.indexOf('aria-label="Status filter"'));
});

const calendarDates = loadModule('src/utils/calendar-date.ts');
const calendarUtils = loadModule('src/features/calendar/calendar.utils.ts');
const attendanceNavigation = loadModule('src/features/attendance/utils/attendance-navigation.ts');

test('BS calendar uses real month lengths and aligns weekdays with AD dates', () => {
  for (const year of [2082, 2083, 2084]) {
    for (let month = 1; month <= 12; month++) {
      const grid = calendarDates.getBSMonth(`${year}-${String(month).padStart(2, '0')}`);
      assert.ok(grid.days.length >= 29 && grid.days.length <= 32);
      const first = new Date(`${grid.days[0].ad}T12:00:00`);
      assert.equal(grid.firstWeekday, first.getDay());
      for (let i = 1; i < grid.days.length; i++) {
        assert.equal(Date.parse(grid.days[i].ad) - Date.parse(grid.days[i - 1].ad), 86400000);
      }
      assert.equal(calendarDates.isValidBSDate(`${year}-${String(month).padStart(2, '0')}-${grid.days.length + 1}`), false);
    }
  }
  assert.equal(calendarDates.shiftBSMonth('2083-12', 1), '2084-01');
  assert.equal(calendarDates.shiftBSMonth('2083-01', -1), '2082-12');
  assert.equal(calendarDates.isValidBSDate('2083-13-01'), false);
  assert.equal(calendarDates.isValidBSDate('2083-01-00'), false);
  assert.equal(calendarDates.isValidBSDate('invalid'), false);
});

test('calendar today uses Nepal midnight independently of the browser timezone', () => {
  assert.equal(calendarDates.getKathmanduToday(new Date('2026-10-10T18:14:59Z')).ad, '2026-10-10');
  const midnight = calendarDates.getKathmanduToday(new Date('2026-10-10T18:15:00Z'));
  assert.equal(midnight.ad, '2026-10-11');
  assert.equal(midnight.bs, '2083-06-25');
});

const attendanceRow = (overrides = {}) => ({
  id: 'r1', studentId: 's1', enrollmentId: 'e1', activityId: 'after', activityName: 'AfterSchool',
  activityCode: 'AF', sessionDateBS: '2083-06-25', status: 'Present', ...overrides,
});
const plannedClass = (overrides = {}) => ({
  id: 'c1', dateBS: '2083-06-25', dateAD: '2026-10-11', type: 'class', title: 'AfterSchool',
  activityId: 'after', activityName: 'AfterSchool', activityCode: 'AF', time: '15:00', notes: '', ...overrides,
});

test('attendance creates one Activity Class per date/activity and merges a scheduled class', () => {
  const rows = [attendanceRow(), attendanceRow({ id: 'r2', status: 'Absent' }), attendanceRow({ id: 'r3', studentId: 's2' }),
    attendanceRow({ activityId: 'music', activityName: 'Music' }), attendanceRow({ sessionDateBS: '2083-06-26' })];
  const automatic = calendarUtils.buildCalendarItems(rows, []);
  assert.equal(automatic.length, 3);
  const after = automatic.find((item) => item.dateBS === '2083-06-25' && item.activityId === 'after');
  assert.equal(after.title, 'AfterSchool');
  assert.equal(after.automatic, true);
  assert.equal(after.records.length, 2);
  assert.equal(after.records[0].status, 'Absent'); // Same duplicate resolution as Attendance.
  const planned = calendarUtils.buildCalendarItems(rows, [plannedClass()]);
  assert.equal(planned.length, 3);
  const merged = planned.find((item) => item.id === 'c1');
  assert.equal(merged.automatic, false);
  assert.equal(merged.records.length, 2);
  assert.equal(merged.time, '15:00');
});

test('calendar uses legacy daily records only where individual records are absent', () => {
  const merged = calendarUtils.mergeCalendarAttendance([attendanceRow()], [attendanceRow({ id: 'stale' }), attendanceRow({ id: 'legacy', sessionDateBS: '2083-06-24' })]);
  assert.equal(merged.map((record) => record.id).join(','), 'r1,legacy');
});

test('class verification respects enrollment start dates and never treats unmarked as absent', () => {
  const item = calendarUtils.buildCalendarItems([attendanceRow()], [plannedClass()])[0];
  const enrollment = { studentId: 's1', activityId: 'after', status: 'Active', enrollmentDate: '2083-06-26' };
  const verification = calendarUtils.verifyClass(item, [enrollment,
    { ...enrollment, studentId: 's2', enrollmentDate: '2083-06-25' },
    { ...enrollment, studentId: 's3', enrollmentDate: '2026-10-10' },
    { ...enrollment, studentId: 's4', enrollmentDate: '2083-06-24', status: 'Inactive' },
    { ...enrollment, studentId: 's5', enrollmentDate: 'invalid' }]);
  assert.equal(verification.eligible, 2);
  assert.equal(verification.unmarked, 2);
  assert.equal(verification.beforeEnrollment, 1);
  assert.equal(item.records.filter((record) => record.status === 'Absent').length, 0);
  assert.equal(calendarDates.normalizeEnrollmentDate('2026-02-30'), null);
});

test('calendar links preserve date and activity, validate dates, and isolate mixed activity status', () => {
  const link = attendanceNavigation.attendanceLink('2083-06-25', 'After & School');
  const params = new URLSearchParams(link.split('?')[1]);
  const filters = attendanceNavigation.readAttendanceFilters(params, '2083-06-26');
  assert.equal(filters.date, '2083-06-25');
  assert.equal(filters.activityId, 'After & School');
  assert.equal(filters.view, 'daily');
  assert.equal(attendanceNavigation.readAttendanceFilters(new URLSearchParams('date=2083-13-01'), '2083-06-26').date, '2083-06-26');
  const rows = [attendanceRow({ status: 'Absent' }), attendanceRow({ activityId: 'music', status: 'Present' })];
  const filtered = attendanceNavigation.filterActivityRecords(rows, 'after');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].status, 'Absent');
});

test('planned class creation prevents duplicates transactionally and stores matching AD date', async () => {
  const db = database();
  const service = loadModule('src/features/calendar/calendar.service.ts', db.mocks);
  const { id: _id, dateAD: _ad, ...entry } = plannedClass();
  await service.createCalendarEntry(entry);
  const stored = db.data.get('calendar_entries/class_2083-06-25_after');
  assert.equal(stored.dateAD, '2026-10-11');
  await assert.rejects(service.createCalendarEntry(entry), /already has a scheduled class/);
  assert.equal(db.writes, 1);
  await assert.rejects(service.createCalendarEntry({ ...entry, dateBS: '2083-13-01' }), /valid Nepali date/);
  await assert.rejects(service.createCalendarEntry({ ...entry, activityId: '' }), /Choose an activity/);
  await assert.rejects(service.createCalendarEntry({ ...entry, time: '24:00' }), /valid time/);
});

test('calendar subscriptions use month-bounded queries, retain attendance on event errors, and unsubscribe', () => {
  const listeners = new Map();
  let stopped = 0;
  const db = database();
  db.mocks['firebase/firestore'].onSnapshot = (reference, next, error) => {
    listeners.set(reference.path, { reference, next, error });
    return () => stopped++;
  };
  let latest;
  const service = loadModule('src/features/calendar/calendar.service.ts', db.mocks);
  const stop = service.subscribeCalendarMonth('2083-06-01', '2083-06-30', (data) => { latest = data; });
  for (const { reference } of listeners.values()) {
    if (reference.path === "activities") continue;
    assert.equal(reference.filters[0].op, '>=');
    assert.equal(reference.filters[0].value, '2083-06-01');
    assert.equal(reference.filters[1].op, '<=');
  }
  listeners.get('attendances').next({ docs: [{ id: 'r1', data: () => attendanceRow() }] });
  listeners.get('daily_attendances').next({ docs: [] });
  listeners.get('activities').next({ docs: [] });
  listeners.get('calendar_entries').error(new Error('permission-denied (expected test)'));
  assert.equal(latest.loading, false);
  assert.equal(latest.entriesError, true);
  assert.equal(latest.attendanceError, false);
  assert.equal(latest.records.length, 1);
  stop();
  assert.equal(stopped, 4);
});

test('calendar date dialog renders an AfterSchool attendance link and separates recorded from unmarked counts', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { MemoryRouter } = require('react-router-dom');
  const db = database();
  const DayDialog = loadModule('src/features/calendar/CalendarDayDialog.tsx', db.mocks).default;
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(DayDialog, {
    date: '2083-06-25', today: '2083-06-25', items: calendarUtils.buildCalendarItems([attendanceRow()], []),
    activities: [], enrollments: [], enrollmentsLoaded: true, isAdmin: false, loading: false,
    entriesUnavailable: false, onClose: () => {},
  })));
  assert.match(html, /Activity Class/);
  assert.match(html, /AfterSchool/);
  assert.match(html, /href="\/attendance\?date=2083-06-25&amp;activityId=after"/);
  assert.match(html, /1 recorded · 1 present · 0 absent/);
  assert.match(html, /unmarked/);
  assert.match(html, /2026-10-11 AD/);
});

test('calendar page renders BS month navigation, AD dates, and date buttons for permitted staff', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { MemoryRouter } = require('react-router-dom');
  const db = database();
  const auth = { role: 'teacher', permissions: { attendance: true }, activityIds: ['after'], isAdmin: false };
  db.mocks['@/app/providers/AuthProvider'] = { useAuth: () => auth };
  const CalendarPage = loadModule('src/features/calendar/CalendarPage.tsx', db.mocks).default;
  const render = () => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ['/calendar?month=2083-06'] }, React.createElement(CalendarPage)));
  const html = render();
  assert.match(html, /Ashwin 2083 BS/);
  assert.match(html, /25 Ashwin 2083 BS, 2026-10-11 AD/);
  assert.match(html, /aria-label="Previous month"/);
  assert.equal((html.match(/aria-label="\d+ Ashwin 2083 BS,/g) || []).length, calendarDates.getBSMonth('2083-06').days.length);
  assert.ok(html.indexOf('aria-label="Search calendar entries"') < html.indexOf('aria-label="Sort records"'));
  assert.ok(html.indexOf('aria-label="Sort records"') < html.indexOf('aria-label="Filter calendar by activity"'));
  auth.permissions.attendance = false;
  assert.doesNotMatch(render(), /Nepali monthly calendar/);
});

const activityColorUtils = loadModule('src/features/activities/utils/activity-color.ts');
const activityFormSchema = loadModule('src/features/activities/schemas/activity.schema.ts').activitySchema;
const coloredActivity = { activityName: 'AfterSchool', category: 'General', status: 'Active', color: '#2563eb' };

test('activity color is mandatory, validates six-digit hex and normalizes case', () => {
  assert.equal(activityFormSchema.parse(coloredActivity).color, '#2563EB');
  for (const color of [undefined, '', '#FFF', 'blue', '#12ZZ34', '#12345678', '2563EB']) {
    assert.equal(activityFormSchema.safeParse({ ...coloredActivity, color }).success, false);
  }
  assert.equal(activityColorUtils.normalizeActivityColor(' #abcdef '), '#ABCDEF');
  const used = new Set();
  for (let index = 0; index < 500; index++) {
    const color = activityColorUtils.nextActivityColor(used);
    assert.equal(used.has(color), false);
    assert.match(color, /^#[0-9A-F]{6}$/);
    used.add(color);
  }
});

test('legacy activities get unique colors automatically and subsequent loads preserve them', async () => {
  const db = database({
    'activities/a': { activityName: 'AfterSchool', activityCode: 'A' },
    'activities/b': { activityName: 'Music', activityCode: 'B', color: '#112233' },
    'activities/c': { activityName: 'Dance', activityCode: 'C', color: '#112233' },
    'activities/d': { activityName: 'Inactive', activityCode: 'D', status: 'Inactive' },
  });
  const service = loadModule('src/features/activities/services/activity-color.service.ts', db.mocks);
  const colors = await service.ensureActivityColors();
  assert.equal(Object.keys(colors).length, 4);
  assert.equal(new Set(Object.values(colors).map((item) => item.color)).size, 4);
  assert.equal(colors.b.color, '#112233');
  for (const [id, item] of Object.entries(colors)) {
    assert.equal(db.data.get(`activities/${id}`).color, item.color);
    assert.equal(db.data.get(`activity_color_locks/${item.color.slice(1)}`).activityId, id);
  }
  const writes = db.writes;
  await service.ensureActivityColors();
  assert.equal(db.writes, writes);
});

test('activity saves reject color conflicts without partial writes and release the old color after editing', async () => {
  const db = database();
  const service = loadModule('src/features/activities/services/activity-color.service.ts', db.mocks);
  await service.writeColoredActivity('a', { activityName: 'A', activityCode: 'A' }, '#aabbcc', { create: true });
  const writes = db.writes;
  await assert.rejects(service.writeColoredActivity('b', { activityName: 'B' }, '#AABBCC', { create: true }), /belongs to another activity/);
  assert.equal(db.writes, writes);
  assert.equal(db.data.has('activities/b'), false);
  await service.writeColoredActivity('a', { activityName: 'Renamed A' }, '#AABBCC');
  assert.equal(db.data.get('activity_colors/a').activityName, 'Renamed A');
  await service.writeColoredActivity('a', {}, '#112233');
  assert.equal(db.data.has('activity_color_locks/AABBCC'), false);
  assert.equal(db.data.get('activity_color_locks/112233').activityId, 'a');
  await service.writeColoredActivity('b', { activityName: 'B' }, '#AABBCC', { create: true });
  assert.equal(db.data.get('activity_color_locks/AABBCC').activityId, 'b');
});

test('competing activity saves reserve only one owner after transaction serialization', async () => {
  const db = database();
  const run = db.mocks['firebase/firestore'].runTransaction;
  let queue = Promise.resolve();
  db.mocks['firebase/firestore'].runTransaction = (...args) => {
    const result = queue.then(() => run(...args));
    queue = result.catch(() => {});
    return result;
  };
  const service = loadModule('src/features/activities/services/activity-color.service.ts', db.mocks);
  const results = await Promise.allSettled(['a', 'b'].map((id) => service.writeColoredActivity(id, { activityName: id }, '#123456', { create: true })));
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(db.data.get('activity_color_locks/123456').activityId, 'a');
  assert.equal(db.data.has('activities/b'), false);
});

test('activity create service enforces required colors before generating codes or writing data', async () => {
  const db = database();
  let generated = 0;
  db.mocks['./activity-code.service'] = { generateActivityCode: async () => { generated++; return 'AC1'; } };
  const service = loadModule('src/features/activities/services/activity.service.ts', db.mocks);
  await assert.rejects(service.addActivity({ ...coloredActivity, color: '' }));
  assert.equal(generated, 0);
  assert.equal(db.writes, 0);
  const id = await service.addActivity(coloredActivity);
  assert.equal(db.data.get(`activities/${id}`).color, '#2563EB');
  assert.equal(db.data.get(`activity_colors/${id}`).color, '#2563EB');
});

test('calendar shows one color dot per activity with accessible names and no visible activity text', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const Dots = loadModule('src/features/calendar/CalendarActivityDots.tsx').default;
  const items = calendarUtils.buildCalendarItems([attendanceRow(), attendanceRow({ studentId: 's2' }), attendanceRow({ activityId: 'music', activityName: 'Music' })], []);
  const html = renderToStaticMarkup(React.createElement(Dots, { items: [...items, items[0]], colors: {
    after: { color: '#123456', activityName: 'AfterSchool' }, music: { color: '#ABCDEF', activityName: 'Music' },
  } }));
  assert.equal((html.match(/role="img"/g) || []).length, 2);
  assert.match(html, /background-color:#123456/);
  assert.match(html, /background-color:#ABCDEF/);
  assert.match(html, /aria-label="AfterSchool"/);
  assert.match(html, /title="Music"/);
  assert.equal(html.replace(/<[^>]*>/g, ''), '');
});

test('calendar fills complete weeks with adjacent-month dates and a matching attendance query range', () => {
  for (const month of ['2083-01', '2083-05', '2083-06', '2083-09', '2083-12']) {
    const grid = calendarDates.getBSCalendarGrid(month);
    assert.equal(grid.cells.length % 7, 0);
    assert.equal(grid.cells.filter((day) => day?.inMonth).length, grid.days.length);
    assert.equal(grid.rangeStart, grid.cells[0].bs);
    assert.equal(grid.rangeEnd, grid.cells.at(-1).bs);
    assert.equal(new Date(`${grid.cells[0].ad}T12:00:00`).getDay(), 0);
    assert.equal(new Date(`${grid.cells.at(-1).ad}T12:00:00`).getDay(), 6);
    for (let index = 1; index < grid.cells.length; index++) {
      assert.equal(Date.parse(grid.cells[index].ad) - Date.parse(grid.cells[index - 1].ad), 86400000);
    }
  }
  assert.equal(calendarDates.formatADMonthRange('2026-08-17', '2026-09-16'), 'Aug/Sep 2026');
  assert.equal(calendarDates.formatADMonthRange('2026-12-16', '2027-01-14'), 'Dec 2026 / Jan 2027');
});

test('compact month view shows English day numbers at the corner and preserves activity accessibility', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const MonthView = loadModule('src/features/calendar/CalendarMonthView.tsx').default;
  const month = '2083-06';
  const calendar = calendarDates.getBSCalendarGrid(month);
  const items = calendarUtils.buildCalendarItems([attendanceRow()], []);
  const html = renderToStaticMarkup(React.createElement(MonthView, {
    month, calendar, today: '2083-06-25', selectedDate: '', byDate: new Map([['2083-06-25', items]]),
    colors: { after: { color: '#123456' } }, loading: false, onMonthChange: () => {}, onSelectDate: () => {},
  }));
  assert.equal((html.match(/data-date-bs=/g) || []).length, calendar.cells.length);
  assert.match(html, /calendar-ad-day" aria-hidden="true">11<\/span>/);
  assert.match(html, /calendar-highlight-date/);
  assert.match(html, /calendar-adjacent-date/);
  assert.match(html, /calendar-english-range/);
  assert.match(html, /aria-label="Sunday"[^>]*>Sun</);
  assert.match(html, /aria-label="[^"<>]+AfterSchool"/);
});

test('attendance saves capture the authenticated recorder and keep original attribution through edits and daily summaries', async () => {
  const db = database({ 'user_roles/teacher@example.com': { label: 'First Teacher' } });
  const auth = { currentUser: { uid: 'teacher-1', email: 'teacher@example.com', displayName: '' } };
  db.mocks['@/firebase/config'].auth = auth;
  const service = loadModule('src/features/attendance/services/attendance.service.ts', db.mocks);
  const row = { ...attendanceRow(), id: undefined, sessionDate: '2026-10-11', studentName: 'Test Student', recordedByName: 'Forged name' };
  await service.saveBatchAttendance([row]);
  let saved = (await service.getAttendanceByDate('2083-06-25'))[0];
  assert.equal(saved.recordedByUserId, 'teacher-1');
  assert.equal(saved.recordedByName, 'First Teacher');
  assert.equal(saved.updatedByName, 'First Teacher');
  assert.equal(db.data.get('daily_attendances/2083-06-25').attendances[0].recordedByName, 'First Teacher');
  auth.currentUser = { uid: 'teacher-2', email: 'second@example.com', displayName: 'Second Teacher' };
  await service.saveBatchAttendance([{ ...row, id: saved.id, status: 'Absent' }]);
  saved = await service.getAttendanceById(saved.id);
  assert.equal(saved.recordedByName, 'First Teacher');
  assert.equal(saved.updatedByUserId, 'teacher-2');
  assert.equal(saved.updatedByName, 'Second Teacher');
  assert.equal(db.data.get('daily_attendances/2083-06-25').activities[0].records[0].updatedByName, 'Second Teacher');
});

test('editing legacy attendance records the editor without inventing an original teacher; signed-out writes fail', async () => {
  const db = database({ 'attendances/old': { ...attendanceRow(), id: undefined, sessionDate: '2026-10-11' } });
  db.mocks['@/firebase/config'].auth = { currentUser: { uid: 'teacher-2', displayName: 'Second Teacher' } };
  const service = loadModule('src/features/attendance/services/attendance.service.ts', db.mocks);
  await service.updateAttendance('old', { status: 'Absent', recordedByName: 'Invented origin' });
  const record = await service.getAttendanceById('old');
  assert.equal(record.recordedByName, '');
  assert.equal(record.updatedByName, 'Second Teacher');
  const writes = db.writes;
  db.mocks['@/firebase/config'].auth.currentUser = null;
  await assert.rejects(service.createAttendance({ ...attendanceRow(), sessionDate: '2026-10-11' }), /Sign in/);
  assert.equal(db.writes, writes);
});

test('activity class counts remain separate, deduplicate dates, and exclude other students and absences', () => {
  const { getActivityClassCounts, getAttendanceTeachers } = loadModule('src/features/attendance/utils/attendance-recorder.ts');
  const after = attendanceRow({ updatedByUserId: 't1', updatedByName: 'First Teacher' });
  const music = attendanceRow({ activityId: 'music', activityName: 'Music', recordedByUserId: 't2', recordedByName: 'Second Teacher' });
  const row = { ...after, groupedRecords: [after, music] };
  const history = [after, after, music, { ...after, sessionDateBS: '2083-06-24' }, { ...after, studentId: 'other' }, { ...music, status: 'Absent', sessionDateBS: '2083-06-23' }];
  const counts = getActivityClassCounts(row, history);
  assert.equal(counts.find((item) => item.id === 'after').count, 2);
  assert.equal(counts.find((item) => item.id === 'music').count, 1);
  assert.equal(getActivityClassCounts(music, history).length, 1);
  assert.equal(getAttendanceTeachers(row.groupedRecords).map((item) => item.name).join(', '), 'First Teacher, Second Teacher');
  assert.equal(getAttendanceTeachers([attendanceRow()])[0].name, 'Not recorded');
});

test('attendance table replaces session fees with teacher names and activity-colored class counts', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const Table = loadModule('src/features/attendance/components/AttendanceTable.tsx').default;
  const row = attendanceRow({ updatedByUserId: 't1', updatedByName: 'Test Teacher', studentName: 'Test Student', sessionFee: 999 });
  const html = renderToStaticMarkup(React.createElement(Table, {
    data: [row], onEdit: () => {}, onDelete: () => {}, classHistory: { s1: [row] },
    activityColors: { after: { color: '#123456', activityName: 'AfterSchool' } },
  }));
  assert.match(html, />Teacher<\/th>/);
  assert.match(html, />Test Teacher<\/p>/);
  assert.doesNotMatch(html, /Session Fee|Rs\./);
  assert.match(html, /AfterSchool: 1 class taken/);
  assert.match(html, /background-color:#123456/);
});

test('attendance selection expands grouped activities once and respects the filtered rows', () => {
  const { attendanceSelectionRecords } = loadModule('src/features/attendance/utils/attendance-selection.ts');
  const first = attendanceRow({ id: 'r1' });
  const second = attendanceRow({ id: 'r2', activityId: 'music' });
  const grouped = { ...first, groupedRecords: [first, second] };
  assert.deepEqual([...attendanceSelectionRecords([grouped, first]).map((record) => record.id)], ['r1', 'r2']);
  assert.deepEqual([...attendanceSelectionRecords([first]).map((record) => record.id)], ['r1']);
  assert.equal(attendanceSelectionRecords([{ ...first, id: undefined }]).length, 0);
});

test('attendance deletion removes individual and summary copies and preserves unselected activities', async () => {
  const first = attendanceRow({ id: 'r1', sessionFee: 100 });
  const second = attendanceRow({ id: 'r2', activityId: 'music', sessionFee: 200 });
  const db = database({
    'attendances/r1': first, 'attendances/r2': second,
    'daily_attendances/2083-06-25': { sessionDateBS: '2083-06-25', attendances: [first, second], totalRecords: 2 },
  });
  const service = loadModule('src/features/attendance/services/attendance.service.ts', db.mocks);
  const result = await service.deleteAttendanceRecords([first, first]);
  assert.equal(result.deleted.length, 1);
  assert.equal(result.failed.length, 0);
  assert.equal(db.data.has('attendances/r1'), false);
  assert.equal(db.data.has('attendances/r2'), true);
  const daily = db.data.get('daily_attendances/2083-06-25');
  assert.equal(daily.totalRecords, 1);
  assert.equal(daily.presentCount, 1);
  assert.equal(daily.totalSessionFees, 200);
  assert.equal(daily.activitiesCount, 1);
  assert.equal(daily.activities[0].activityId, 'music');
  assert.equal(daily.attendances[0].id, 'r2');
  await service.deleteAttendance('r2');
  assert.equal(db.data.has('daily_attendances/2083-06-25'), false);
  assert.equal(await service.getDailyAttendanceByDate('2083-06-25'), null, 'last deleted attendance must not return via daily fallback');
});

test('legacy daily-only attendance can be deleted without touching a different student', async () => {
  const first = attendanceRow();
  const second = attendanceRow({ studentId: 's2' });
  delete first.id;
  delete second.id;
  const db = database({ 'daily_attendances/2083-06-25': { sessionDateBS: '2083-06-25', attendances: [first, second] } });
  const service = loadModule('src/features/attendance/services/attendance.service.ts', db.mocks);
  const daily = await service.getDailyAttendanceByDate('2083-06-25');
  const result = await service.deleteAttendanceRecords([daily.attendances.find((record) => record.studentId === first.studentId)]);
  assert.equal(result.deleted.length, 1);
  assert.equal(result.failed.length, 0);
  const remaining = await service.getDailyAttendanceByDate('2083-06-25');
  assert.equal(remaining.attendances.length, 1);
  assert.equal(remaining.attendances[0].studentId, 's2');
});

test('a changed attendance identity prevents deleting any records in its transaction', async () => {
  const first = attendanceRow({ id: 'r1' });
  const db = database({ 'attendances/r1': { ...first, studentId: 'different-student' } });
  const service = loadModule('src/features/attendance/services/attendance.service.ts', db.mocks);
  const result = await service.deleteAttendanceRecords([first]);
  assert.equal(result.deleted.length, 0);
  assert.equal(result.failed.length, 1);
  assert.equal(db.writes, 0);
  assert.equal(db.data.get('attendances/r1').studentId, 'different-student');
});

test('bulk attendance deletion chunks large selections and retains failed records for retry', async () => {
  const rows = Array.from({ length: 201 }, (_, index) => attendanceRow({ id: `r${index}`, studentId: `s${index}` }));
  const db = database(Object.fromEntries(rows.map((record) => [`attendances/${record.id}`, record])));
  const runTransaction = db.mocks['firebase/firestore'].runTransaction;
  let transactions = 0;
  db.mocks['firebase/firestore'].runTransaction = async (...args) => {
    if (++transactions === 2) throw new Error('permission-denied');
    return runTransaction(...args);
  };
  const service = loadModule('src/features/attendance/services/attendance.service.ts', db.mocks);
  const result = await service.deleteAttendanceRecords(rows);
  assert.equal(transactions, 2);
  assert.equal(result.deleted.length, 200);
  assert.equal(result.failed.length, 1);
  assert.equal(db.data.has('attendances/r200'), true);
  assert.equal(db.data.has('attendances/r0'), false);
});

test('attendance selectors select every filtered record across pages and expand grouped rows', () => {
  const Table = loadModule('src/features/attendance/components/AttendanceTable.tsx').default;
  const rows = Array.from({ length: 12 }, (_, index) => attendanceRow({ id: `r${index}`, studentId: `s${index}`, studentName: `Student ${index}` }));
  rows[0].groupedRecords = [rows[0], attendanceRow({ id: 'music', activityId: 'music' })];
  let selected = [];
  const tree = Table({ data: rows, onEdit: () => {}, onDelete: () => {}, onSelectionChange: (ids) => { selected = ids; } });
  const inputs = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    if (node.type === 'input') inputs.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  inputs[0].props.onChange();
  assert.equal(selected.length, 13);
  assert.ok(selected.includes('music'));
  const html = require('react-dom/server').renderToStaticMarkup(require('react').createElement(Table, {
    data: rows, selectedIds: selected, onSelectionChange: () => {}, onEdit: () => {}, onDelete: () => {},
  }));
  assert.match(html, /Select all 13 filtered attendance records across pages/);
  assert.match(html, /Select Student 0 on 2083-06-25: 2 activity records/);
  assert.match(html, /type="checkbox"[^>]*checked=""/);
});

test('activity renames resolve existing enrollment, attendance, invoice and report labels by ID without changing fees', async () => {
  const legacy = { activityId: 'a1', activityName: 'Typo', activityCode: 'OLD' };
  const row = attendanceRow({ ...legacy, enrollmentId: 'e1', studentId: 's1', sessionFee: 125, chargeAmount: 125 });
  const db = database({
    'activities/a1': { activityName: 'Correct Name', activityCode: 'AC1', status: 'Inactive' },
    'enrollments/e1': { ...legacy, studentId: 's1', sessionFee: 125, status: 'Active', enrollmentDate: '2083-06-01' },
    'attendances/r1': row,
    'invoices/i1': { studentId: 's1', billingMonth: '2083-06', invoiceDate: '2083-06-25', lines: [{ ...legacy, amount: 125 }, { activityName: 'Manual charge', amount: 25 }], totalAmount: 150, dueAmount: 150 },
  });
  const enrollments = loadModule('src/features/enrollments/services/enrollment.service.ts', db.mocks);
  const attendance = loadModule('src/features/attendance/services/attendance.service.ts', db.mocks);
  const invoices = loadModule('src/features/finance/services/invoice.service.ts', db.mocks);
  const fees = loadModule('src/features/finance/services/fee-calculation.service.ts', db.mocks);
  const reports = loadModule('src/features/reports/services/reports.service.ts', db.mocks);
  for (const name of ['Correct Name', 'Renamed Again']) {
    db.data.set('activities/a1', { activityName: name, activityCode: 'AC1', status: 'Inactive' });
    for (const records of await Promise.all([
      enrollments.getEnrollments(), fees.getStudentEnrollments('s1'), attendance.getAllAttendances(),
      attendance.getAttendanceByDate(row.sessionDateBS), attendance.getAttendanceByStudentId('s1'),
      attendance.getAttendanceByEnrollmentId('e1'), attendance.getAttendanceByActivityId('a1'),
      fees.getEnrollmentAttendance('e1', '2083-06'), fees.getStudentAttendanceForMonth('s1', '2083-06'),
    ])) {
      assert.equal(records.length, 1);
      assert.equal(records[0].activityName, name);
      assert.equal(records[0].activityCode, 'AC1');
      assert.equal(records[0].sessionFee, 125);
    }
    assert.equal((await enrollments.getEnrollmentById('e1')).activityName, name);
    assert.equal((await attendance.getAttendanceById('r1')).activityName, name);
    const daily = await attendance.getDailyAttendanceByDate(row.sessionDateBS);
    assert.equal(daily.activities[0].activityName, name);
    assert.equal(daily.activities[0].records[0].activityName, name);
    for (const list of await Promise.all([invoices.getInvoices(), invoices.getInvoicesByStudentId('s1'), invoices.getInvoicesByMonth('2083-06')])) {
      assert.equal(list[0].lines[0].activityName, name);
      assert.equal(list[0].lines[1].activityName, 'Manual charge');
      assert.equal(list[0].totalAmount, 150);
    }
    assert.equal((await invoices.getInvoiceById('i1')).lines[0].activityName, name);
    assert.equal((await invoices.getInvoiceByStudentAndMonth('s1', '2083-06')).lines[0].activityName, name);
    assert.equal((await reports.getReportData()).recentEnrollments[0].activityName, name);
  }
  assert.equal(db.writes, 0);
  assert.equal(db.data.get('enrollments/e1').activityName, 'Typo');
});

test('legacy daily-only attendance resolves names before grouping and preserves amounts', async () => {
  const row = attendanceRow({ activityId: 'a1', activityName: 'Typo', sessionFee: 90 });
  const db = database({
    'activities/a1': { activityName: 'Renamed', activityCode: 'AC1' },
    [`daily_attendances/${row.sessionDateBS}`]: { attendances: [row], activities: [{ activityName: 'Typo' }] },
  });
  const service = loadModule('src/features/attendance/services/attendance.service.ts', db.mocks);
  const daily = await service.getDailyAttendanceByDate(row.sessionDateBS);
  assert.equal(daily.attendances[0].activityName, 'Renamed');
  assert.equal(daily.activities[0].activityName, 'Renamed');
  assert.equal(daily.totalSessionFees, 90);
});

test('activity lookup uses only IDs, retains orphan/manual labels, and never reuses a cached name', async () => {
  const db = database({ 'activities/a1': { activityName: 'Current', activityCode: 'NEW' } });
  const service = loadModule('src/features/activities/services/activity-reference.service.ts', db.mocks);
  const records = [
    { activityId: 'a1', activityName: 'Old', sessionFee: 75 },
    { activityId: 'deleted', activityName: 'Archived label' },
    { activityId: 'missing' },
    { activityName: 'Manual label' },
    { activityId: 'another', activityName: 'Current' },
  ];
  const result = await service.hydrateActivityReferences(records);
  assert.equal(result[0].activityName, 'Current');
  assert.equal(result[0].sessionFee, 75);
  assert.equal(result[1].activityName, 'Archived label');
  assert.equal(result[2].activityName, 'Unavailable activity (missing)');
  assert.equal(result[3].activityName, 'Manual label');
  assert.equal(result[4].activityId, 'another');
  assert.equal(result[4].activityCode, '');
  assert.equal(records[0].activityName, 'Old');
});

test('restricted staff resolve names through the projection; other read errors are not hidden', async () => {
  const db = database({ 'activity_colors/a1': { activityName: 'Renamed', activityCode: 'AC1' } });
  const firestore = db.mocks['firebase/firestore'];
  const getDocs = firestore.getDocs;
  let code = 'permission-denied';
  firestore.getDocs = async (ref) => {
    if (ref.path === 'activities') throw Object.assign(new Error(code), { code });
    return getDocs(ref);
  };
  const service = loadModule('src/features/activities/services/activity-reference.service.ts', db.mocks);
  assert.equal((await service.hydrateActivityReferences([{ activityId: 'a1', activityName: 'Typo' }]))[0].activityName, 'Renamed');
  code = 'unavailable';
  await assert.rejects(service.hydrateActivityReferences([{ activityId: 'a1' }]), /unavailable/);
});

test('new enrollments and attendance store activity IDs and load the current name after renaming', async () => {
  const db = database({
    'activities/a1': { activityName: 'Original', activityCode: 'AC1', feePerSession: 125 },
    'students/s1': { fullName: 'Student' },
  });
  db.mocks['@/features/attendance/services/attendance-recorder.service'] = { getAttendanceActor: async () => ({ uid: 'admin', name: 'Admin' }) };
  db.mocks['./attendance-recorder.service'] = db.mocks['@/features/attendance/services/attendance-recorder.service'];
  db.mocks['@/firebase/config'].auth = { currentUser: { uid: 'admin' } };
  const enrollmentService = loadModule('src/features/enrollments/services/enrollment.service.ts', db.mocks);
  const attendanceService = loadModule('src/features/attendance/services/attendance.service.ts', db.mocks);
  const input = { studentId: 's1', activityId: 'a1', enrollmentDate: '2083-06-01', status: 'Active' };
  const id = await enrollmentService.addEnrollment(input);
  assert.equal(db.data.get(`enrollments/${id}`).activityName, undefined);
  await attendanceService.saveBatchAttendance([attendanceRow({ id: undefined, enrollmentId: id, studentId: 's1', activityId: 'a1', activityName: 'Stale client name', sessionDate: '2026-10-11' })]);
  const stored = [...db.data.entries()].find(([key]) => key.startsWith('attendances/'))[1];
  assert.equal(stored.activityId, 'a1');
  assert.equal(stored.activityName, undefined);
  const daily = [...db.data.entries()].find(([key]) => key.startsWith('daily_attendances/'))[1];
  assert.equal(daily.attendances[0].activityName, undefined);
  assert.equal(daily.activities[0].activityName, undefined);
  db.data.set('activities/a1', { activityName: 'Corrected', activityCode: 'AC1', feePerSession: 125 });
  assert.equal((await enrollmentService.getEnrollmentById(id)).activityName, 'Corrected');
  assert.equal((await attendanceService.getAllAttendances())[0].activityName, 'Corrected');
  db.data.set(`enrollments/${id}`, { ...db.data.get(`enrollments/${id}`), activityName: 'Legacy' });
  await enrollmentService.updateEnrollment(id, input);
  assert.equal(db.data.get(`enrollments/${id}`).activityName, undefined);
});

test('calendar updates attendance and scheduled class labels when the activity subscription changes', async () => {
  const callbacks = new Map();
  const stopped = [];
  const db = database();
  db.mocks['firebase/firestore'].onSnapshot = (ref, next) => {
    callbacks.set(ref.path, next);
    return () => stopped.push(ref.path);
  };
  const service = loadModule('src/features/calendar/calendar.service.ts', db.mocks);
  let latest;
  const stop = service.subscribeCalendarMonth('2083-06-01', '2083-06-30', (value) => { latest = value; });
  const emit = (name, records) => callbacks.get(name)({ docs: records.map(([id, data]) => ({ id, data: () => data })) });
  emit('attendances', [['r1', attendanceRow({ activityId: 'a1', activityName: 'Typo' })]]);
  emit('daily_attendances', []);
  emit('calendar_entries', [['c1', { type: 'class', activityId: 'a1', activityName: 'Typo', title: 'Typo' }]]);
  assert.equal(latest.loading, true);
  for (const activityName of ['Corrected', 'Renamed Again']) {
    emit('activities', [['a1', { activityName, activityCode: 'AC1' }]]);
    assert.equal(latest.loading, false);
    assert.equal(latest.records[0].activityName, activityName);
    assert.equal(latest.entries[0].activityName, activityName);
    assert.equal(latest.entries[0].title, activityName);
  }
  stop();
  assert.equal(stopped.length, 4);
});

test('attendance actor uses staff full name instead of role label or auth display name', async () => {
  const db = database({
    'staff/staff1': { fullName: 'Mina Shrestha', email: 'teacher@example.com' },
    'user_roles/teacher@example.com': { role: 'music_teacher', label: 'music_teacher' },
  });
  db.mocks['@/firebase/config'].auth = { currentUser: { uid: 't1', email: 'teacher@example.com', displayName: 'Music Teacher' } };
  const { getAttendanceActor } = loadModule('src/features/attendance/services/attendance-recorder.service.ts', db.mocks);
  const actor = await getAttendanceActor();
  assert.equal(actor.name, 'Mina Shrestha');
  assert.equal(actor.staffId, 'staff1');
  assert.equal(actor.email, 'teacher@example.com');
});

test('admin attendance identifies the administrator by email, even when a display name or staff record exists', async () => {
  const db = database({
    'staff/admin1': { fullName: 'Admin Full Name', email: 'owner@example.com' },
    'user_roles/owner@example.com': { role: 'admin', label: 'Director' },
  });
  db.mocks['@/firebase/config'].auth = { currentUser: { uid: 'a1', email: 'owner@example.com', displayName: 'Director' } };
  const actor = await loadModule('src/features/attendance/services/attendance-recorder.service.ts', db.mocks).getAttendanceActor();
  assert.equal(actor.name, 'owner@example.com');
  assert.equal(actor.role, 'admin');
});

test('every attendance save appends actor and field changes without replacing the original recorder', async () => {
  const db = database({ 'staff/staff1': { fullName: 'Original Staff', email: 'teacher@example.com' } });
  const auth = { currentUser: { uid: 't1', email: 'teacher@example.com' } };
  db.mocks['@/firebase/config'].auth = auth;
  const service = loadModule('src/features/attendance/services/attendance.service.ts', db.mocks);
  const id = await service.createAttendance({ ...attendanceRow(), sessionDate: '2083-06-25', notes: 'First note', recordedByName: 'Forged' });
  auth.currentUser = { uid: 'admin', email: 'admin@gmail.com', displayName: 'Wrong name' };
  await service.updateAttendance(id, { status: 'Absent', notes: 'Corrected', recordedByName: 'Forged again' });
  await service.updateAttendance(id, { notes: 'Another correction' });
  await service.updateAttendance(id, { notes: 'Another correction' });
  const record = await service.getAttendanceById(id);
  assert.equal(record.recordedByName, 'Original Staff');
  assert.equal(record.updatedByName, 'admin@gmail.com');
  const history = [...db.data.entries()].filter(([key]) => key.startsWith(`attendances/${id}/auditLogs/`)).map(([, value]) => value);
  assert.equal(history.length, 4);
  assert.equal(history[0].action, 'created');
  assert.equal(history[1].actor.email, 'admin@gmail.com');
  assert.equal(history[1].changes.find((item) => item.field === 'status').before, 'Present');
  assert.equal(history[1].changes.find((item) => item.field === 'status').after, 'Absent');
  assert.equal(history[2].changes.find((item) => item.field === 'notes').before, 'Corrected');
  assert.equal(history[2].changes.find((item) => item.field === 'notes').after, 'Another correction');
  assert.equal(history[3].action, 'saved');
  assert.equal(history[3].changes.length, 0);
  assert.ok(history.every((entry) => entry.createdAt === 'server-time'));
});

test('attendance and history roll back together if the audit write fails', async () => {
  const db = database();
  db.mocks['@/firebase/config'].auth = { currentUser: { uid: 't1', email: 'teacher@example.com' } };
  const original = db.mocks['firebase/firestore'].runTransaction;
  db.mocks['firebase/firestore'].runTransaction = (store, callback) => original(store, (transaction) => callback({
    ...transaction,
    set: (ref, value) => { if (ref.path.includes('/auditLogs/')) throw new Error('Audit failed'); transaction.set(ref, value); },
  }));
  const service = loadModule('src/features/attendance/services/attendance.service.ts', db.mocks);
  await assert.rejects(service.createAttendance({ ...attendanceRow(), sessionDate: '2083-06-25' }), /Audit failed/);
  assert.equal([...db.data.keys()].filter((key) => key.startsWith('attendances/')).length, 0);
});

test('Teacher display shows the recorder and last saver without change history', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const Details = loadModule('src/features/attendance/components/AttendanceRecorderDetails.tsx').default;
  const html = renderToStaticMarkup(React.createElement(Details, { records: [attendanceRow({
    recordedByUserId: 't1', recordedByName: 'Original Staff', recordedByRole: 'staff',
    updatedByUserId: 'a1', updatedByName: 'Admin display name', updatedByEmail: 'admin@example.com', updatedByRole: 'admin',
  })] }));
  assert.match(html, />Original Staff<\/p>/);
  assert.match(html, /Last saved by admin@example.com/);
  assert.doesNotMatch(html, /Change history|<details/);
  assert.doesNotMatch(html, /Admin display name/);
});
