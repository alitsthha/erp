import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
function load(file, mocks = {}, cache = new Map()) {
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
      return load(existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`, mocks, cache);
    }
    return require(specifier);
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, console, Error, Date, queueMicrotask }, { filename });
  return module.exports;
}
const sources = () => ({
  attendances: [], daily_attendances: [],
  students: [{ id: 's1', fullName: 'Current Student', studentCode: 'ST1', status: 'Active' }, { id: 's2', fullName: 'Inactive', status: 'Inactive' }],
  activities: [{ id: 'a1', activityName: 'Art' }, { id: 'a2', activityName: 'Music' }],
  enrollments: [
    { id: 'e1', studentId: 's1', activityId: 'a1', countedMonthly: true, monthlyFee: 1000, enrollmentDate: '2083-01-01', status: 'Active' },
    { id: 'e2', studentId: 's1', activityId: 'a2', countedMonthly: false, monthlyFee: 500, sessionFee: 100, expectedSessionsPerMonth: 5, status: 'Active' },
    { id: 'inactiveStudent', studentId: 's2', activityId: 'a1', countedMonthly: true, monthlyFee: 9000, status: 'Active' },
    { id: 'deleted', studentId: 's1', countedMonthly: true, monthlyFee: 9000, status: 'Active', deletedAt: true },
    { id: 'future', studentId: 's1', countedMonthly: true, monthlyFee: 300, enrollmentDate: '2083-07-01', status: 'Active' },
  ],
  financeIncome: [{ id: 'income', amount: 1200, incomeDate: '2083-06-10' }, { id: 'deleted', amount: 9000, deletedAt: true }],
  financeExpenses: [{ id: 'expense', amount: 200 }, { id: 'deleted', amount: 9000, deletedAt: true }],
  invoices: [
    { id: 'i1', studentId: 's1', invoiceNumber: 'INV1', invoiceDate: '2083-06-28', totalAmount: 1000, paidAmount: 500, dueAmount: 500, status: 'Partially Paid', lines: [{ activityId: 'a1', amount: 400 }, { enrollmentId: 'e2', amount: 600 }] },
    { id: 'paid', dueAmount: 9000, status: 'Paid' }, { id: 'cancelled', dueAmount: 9000, status: 'Cancelled' }, { id: 'deleted', dueAmount: 9000, deletedAt: true },
  ],
  financePayments: [
    { id: 'cash', amount: 100, paymentMethod: 'Cash' }, { id: 'bank', amount: 200, paymentMethod: 'Bank Transfer' },
    { id: 'online', amount: 50, paymentMethod: 'Khalti' }, { id: 'pending', amount: 9000, paymentMethod: 'Cash', status: 'pending' },
    { id: 'cancelled', amount: 9000, paymentMethod: 'Cash', status: 'cancelled' }, { id: 'deleted', amount: 9000, paymentMethod: 'Bank', deletedAt: true },
  ],
});
function service(firestore = {}) {
  return load('src/features/finance/services/finance-overview.service.ts', { 'firebase/firestore': firestore, '@/firebase/config': { db: {} }, '@/utils/calendar-date': { getKathmanduToday: () => ({ bs: '2083-08-01' }) } });
}
const sum = (rows) => Math.round(rows.reduce((total, row) => total + row.amount, 0) * 100) / 100;

test('every overview card reconciles with its detail records and excludes removed/cancelled records', () => {
  const api = service();
  const data = api.buildFinanceOverviewData(sources(), '2083-06');
  const cases = { income: 1200, expenses: 200, 'net-profit': 1000, outstanding: 500, cash: 100, bank: 250, 'expected-income': 1500 };
  for (const [metric, expected] of Object.entries(cases)) assert.equal(sum(api.financeDetailRows(data, metric)), expected, metric);
  assert.equal(data.summary.totalIncome, 1200);
  assert.equal(data.summary.totalExpenses, 200);
  assert.equal(data.summary.netProfit, 1000);
  assert.equal(data.summary.outstandingAmount, 500);
  assert.equal(data.summary.outstandingInvoices, 1);
  assert.equal(data.summary.cashBalance, 100);
  assert.equal(data.summary.bankBalance, 250);
  assert.equal(data.expectedIncome, 1500);
  assert(!data.income.some((row) => row.deletedAt));
});

test('multiple activity selections show only their share of outstanding balances without duplicating invoices', () => {
  const api = service();
  const rows = api.outstandingRows(api.buildFinanceOverviewData(sources(), '2083-06'));
  assert.equal(rows.length, 2);
  assert.equal(sum(api.filterFinanceDetailRows(rows, ['a1'])), 200);
  assert.equal(sum(api.filterFinanceDetailRows(rows, ['a2'])), 300);
  assert.equal(sum(api.filterFinanceDetailRows(rows, ['a1', 'a2', 'a1'])), 500);
  assert.equal(sum(api.filterFinanceDetailRows(rows, [])), 500);
  assert.equal(sum(api.filterFinanceDetailRows(rows, ['a1', 'a2'], 'music')), 300);
  assert.equal(api.filterFinanceDetailRows(rows, ['missing']).length, 0);
  assert.equal(rows[0].name, 'Current Student');
});

test('outstanding allocations preserve cents and retain unassigned invoice balances', () => {
  const api = service();
  const source = sources();
  source.invoices = [
    { id: 'small', dueAmount: 0.05, lines: [{ activityId: 'a1', amount: 1 }, { activityId: 'a2', amount: 1 }, { activityId: 'a3', amount: 1 }] },
    { id: 'manual', dueAmount: 20, lines: [] },
    { id: 'legacy', dueAmount: 10, lines: [{ activityName: 'Legacy Activity', amount: 10 }] },
  ];
  const data = api.buildFinanceOverviewData(source, '2083-06');
  const rows = api.outstandingRows(data);
  assert.equal(sum(rows), 30.05);
  assert.equal(data.summary.outstandingAmount, 30.05);
  assert.deepEqual(Array.from(rows.filter((row) => row.invoiceId === 'small'), (row) => row.amount), [0.02, 0.02, 0.01]);
  assert.equal(sum(api.filterFinanceDetailRows(rows, ['unassigned'])), 20);
  assert.equal(sum(api.filterFinanceDetailRows(rows, ['legacy:Legacy Activity'])), 10);
});

test('expected income follows active enrollment plans, selected month and multiple activity filters', () => {
  const api = service();
  const data = api.buildFinanceOverviewData(sources(), '2083-06');
  const rows = api.expectedIncomeRows(data);
  assert.equal(sum(api.filterFinanceDetailRows(rows, ['a1'])), 1000);
  assert.equal(sum(api.filterFinanceDetailRows(rows, ['a2'])), 500);
  assert.equal(sum(api.filterFinanceDetailRows(rows, ['a1', 'a2'])), 1500);
  assert.equal(sum(api.expectedIncomeRows(data, '2083-07')), 1800);
  assert.equal(rows.find((row) => row.id === 'e2').description, '5 expected sessions × Rs. 100 (no attendance data)');
  assert(!rows.some((row) => row.studentId === 's2'));
  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
});

test('overview subscription updates cards and detail records together and releases all listeners', async () => {
  const current = sources();
  const listeners = new Map();
  const errors = [];
  const api = service({
    collection: (_, name) => name,
    onSnapshot: (name, callback) => { listeners.set(name, callback); return () => listeners.delete(name); },
  });
  let data;
  const stop = api.subscribeFinanceOverview((value) => { data = value; }, (error) => errors.push(error));
  const emit = (name) => listeners.get(name)({ docs: current[name].map((item) => ({ id: item.id, data: () => item })) });
  for (const name of listeners.keys()) emit(name);
  await new Promise(setImmediate);
  assert.equal(listeners.size, 9);
  assert.equal(data.summary.outstandingAmount, 500);
  current.invoices[0].dueAmount = 100;
  emit('invoices');
  await new Promise(setImmediate);
  assert.equal(data.summary.outstandingAmount, 100);
  assert.equal(sum(api.outstandingRows(data)), 100);
  const plannedTotal = data.expectedIncome;
  current.attendances = [{ id: 'live', enrollmentId: 'e2', studentId: 's1', activityId: 'a2', sessionDateBS: `${data.month}-02`, status: 'Present' }];
  emit('attendances');
  await new Promise(setImmediate);
  assert.equal(data.expectedIncome, plannedTotal - 400);
  assert.equal(sum(api.expectedIncomeRows(data)), data.expectedIncome);
  current.daily_attendances = [{ id: 'daily', sessionDateBS: `${data.month}-03`, attendances: [{ enrollmentId: 'e2', studentId: 's1', activityId: 'a2', status: 'Present' }] }];
  emit('daily_attendances');
  await new Promise(setImmediate);
  assert.equal(data.expectedIncome, plannedTotal - 300);
  current.students[0].status = 'Inactive';
  emit('students');
  await new Promise(setImmediate);
  assert.equal(data.expectedIncome, 0);
  assert.equal(errors.length, 0);
  stop();
  assert.equal(listeners.size, 0);
});

test('outstanding detail route renders its records and multiple activity checkboxes', () => {
  const api = service();
  const data = api.buildFinanceOverviewData(sources(), '2083-06');
  const Page = load('src/features/finance/pages/FinanceMetricPage.tsx', {
    '../hooks/useFinanceOverview': { useFinanceOverview: () => ({ data, loading: false, error: '' }) },
    '@/components/forms/NepaliDatePickerInput': { default: () => null },
    'firebase/firestore': {}, '@/firebase/config': { db: {} },
  }).default;
  const React = require('react');
  const { MemoryRouter, Routes, Route } = require('react-router-dom');
  const tree = React.createElement(MemoryRouter, { initialEntries: ['/finance/overview/outstanding'] },
    React.createElement(Routes, null, React.createElement(Route, { path: '/finance/overview/:metric', element: React.createElement(Page) })));
  const html = require('react-dom/server').renderToStaticMarkup(tree);
  assert.match(html, /Outstanding/);
  assert.match(html, /Current Student/);
  assert.match(html, /INV1/);
  assert.match(html, /Rs\. 500/);
  assert.match(html, /Art/);
  assert.match(html, /Music/);
  assert.equal((html.match(/type="checkbox"/g) || []).length, 2);
  assert.match(html, /Back to overview/);
});

test('expected income uses the full month of Present sessions when activity attendance exists', () => {
  const api = service();
  const source = sources();
  source.attendances = [
    { id: 'first', enrollmentId: 'e2', studentId: 's1', activityId: 'a2', sessionDateBS: '2083-06-01', status: 'Present' },
    { id: 'last', enrollmentId: 'e2', studentId: 's1', activityId: 'a2', sessionDateBS: '2083-06-31', status: 'Present' },
    { id: 'duplicate', enrollmentId: 'e2', studentId: 's1', activityId: 'a2', sessionDateBS: '2083-06-01', status: 'Present' },
    { id: 'absent', enrollmentId: 'e2', studentId: 's1', activityId: 'a2', sessionDateBS: '2083-06-10', status: 'Absent' },
    { id: 'deleted', enrollmentId: 'e2', studentId: 's1', activityId: 'a2', sessionDateBS: '2083-06-11', status: 'Present', deletedAt: true },
    { id: 'previous', enrollmentId: 'e2', studentId: 's1', activityId: 'a2', sessionDateBS: '2083-05-30', status: 'Present' },
    { id: 'next', enrollmentId: 'e2', studentId: 's1', activityId: 'a2', sessionDateBS: '2083-07-01', status: 'Present' },
  ];
  const data = api.buildFinanceOverviewData(source, '2083-06');
  const rows = api.expectedIncomeRows(data);
  const sessions = rows.find((row) => row.id === 'e2');
  assert.equal(sessions.date, '2083-06', 'detail rows represent a month, not the first day');
  assert.equal(sessions.amount, 200);
  assert.equal(sessions.sessions, 2);
  assert.equal(sessions.basis, 'attendance');
  assert.deepEqual([...sessions.attendanceDates], ['2083-06-01', '2083-06-31']);
  assert.equal(rows.find((row) => row.id === 'e1').amount, 1000, 'flat monthly fees are independent of attendance');
  assert.equal(data.expectedIncome, 1200);
  assert.equal(sum(api.filterFinanceDetailRows(rows, ['a2'])), 200);
  assert.equal(sum(api.expectedIncomeRows(data, '2083-07')), 1400, 'only next-month attendance is used in that month');
});

test('an activity with recorded absences must not fall back to planned sessions for unmarked students', () => {
  const api = service();
  const source = sources();
  source.attendances = [{ id: 'otherStudent', enrollmentId: 'other', studentId: 'other', activityId: 'a2', sessionDateBS: '2083-06-10', status: 'Absent' }];
  const data = api.buildFinanceOverviewData(source, '2083-06');
  const row = api.expectedIncomeRows(data).find((item) => item.id === 'e2');
  assert.equal(row.amount, 0);
  assert.equal(row.sessions, 0);
  assert.equal(row.basis, 'attendance');
  assert.equal(data.expectedIncome, 1000);
  assert.equal(sum(api.expectedIncomeRows(data, '2083-05')), 1500, 'a month with no attendance still uses a clearly labeled plan');
});

test('expected income applies legacy daily fallback, normalizes AD dates and keeps tombstones authoritative', () => {
  const api = service();
  const source = sources();
  const attendance = (id, date, extra = {}) => ({ id, enrollmentId: 'e2', studentId: 's1', activityId: 'a2', sessionDateBS: date, status: 'Present', ...extra });
  source.attendances = [attendance('dead', '2083-06-10', { deletedAt: true }), attendance('individual', '2083-06-12')];
  source.daily_attendances = [
    { id: 'deletedFallback', sessionDateBS: '2083-06-10', attendances: [attendance('dead', '2083-06-10')] },
    { id: 'duplicateFallback', sessionDateBS: '2083-06-12', attendances: [attendance('old', '2083-06-12')] },
    { id: 'dailyOnly', sessionDateBS: '2083-06-15', attendances: [attendance('daily', '')] },
    { id: 'deletedDay', sessionDateBS: '2083-06-16', deletedAt: true, attendances: [attendance('deleted', '2083-06-16')] },
  ];
  const row = api.expectedIncomeRows(api.buildFinanceOverviewData(source, '2083-06')).find((item) => item.id === 'e2');
  assert.equal(row.amount, 200);
  assert.deepEqual([...row.attendanceDates], ['2083-06-12', '2083-06-15']);
  source.attendances = [{ id: 'ad', enrollmentId: 'e2', studentId: 's1', activityId: 'a2', sessionDate: '2026-10-14', status: 'Present' }];
  source.daily_attendances = [];
  const adRow = api.expectedIncomeRows(api.buildFinanceOverviewData(source, '2083-06')).find((item) => item.id === 'e2');
  assert.equal(adRow.amount, 100);
  assert.equal(adRow.attendanceDates.length, 1);
});

test('session calculation excludes attendance before enrollment or after today and scopes fallback to the activity', () => {
  const api = service();
  const source = sources();
  source.enrollments[1].enrollmentDate = '2083-06-10';
  source.attendances = [
    { id: 'beforeEnrollment', enrollmentId: 'e2', studentId: 's1', activityId: 'a2', sessionDateBS: '2083-06-09', status: 'Present' },
    { id: 'valid', enrollmentId: 'e2', studentId: 's1', activityId: 'a2', sessionDateBS: '2083-06-10', status: 'Present' },
    { id: 'future', enrollmentId: 'e2', studentId: 's1', activityId: 'a2', sessionDateBS: '2083-08-02', status: 'Present' },
  ];
  const data = api.buildFinanceOverviewData(source, '2083-06');
  assert.equal(api.expectedIncomeRows(data).find((item) => item.id === 'e2').amount, 100);
  const future = api.expectedIncomeRows(data, '2083-08').find((item) => item.id === 'e2');
  assert.equal(future.amount, 500);
  assert.equal(future.basis, 'planned');
  source.attendances = [{ id: 'otherActivity', enrollmentId: 'e1', studentId: 's1', activityId: 'a1', sessionDateBS: '2083-06-10', status: 'Present' }];
  const other = api.expectedIncomeRows(api.buildFinanceOverviewData(source, '2083-06')).find((item) => item.id === 'e2');
  assert.equal(other.amount, 500);
  assert.equal(other.basis, 'planned');
});

test('expected-income route renders month and year selectors without a day picker', () => {
  const api = service();
  const data = api.buildFinanceOverviewData(sources(), '2083-06');
  const Page = load('src/features/finance/pages/FinanceMetricPage.tsx', {
    '../hooks/useFinanceOverview': { useFinanceOverview: () => ({ data, loading: false, error: '' }) },
    'firebase/firestore': {}, '@/firebase/config': { db: {} },
  }).default;
  const React = require('react');
  const { MemoryRouter, Routes, Route } = require('react-router-dom');
  const tree = React.createElement(MemoryRouter, { initialEntries: ['/finance/overview/expected-income?month=2083-06'] },
    React.createElement(Routes, null, React.createElement(Route, { path: '/finance/overview/:metric', element: React.createElement(Page) })));
  const html = require('react-dom/server').renderToStaticMarkup(tree);
  assert.match(html, /Expected income month \(BS\)/);
  assert.match(html, /Month \(BS\)/);
  assert.match(html, /Ashwin/);
  assert.match(html, /value="06" selected=""/);
  assert.match(html, /value="2083" selected=""/);
  assert(!html.includes('2083-06-01'));
  assert(!html.includes('type="date"'));
});


test('monthly overview filters every financial source inclusively and overall restores all records', () => {
  const api = service();
  const source = sources();
  source.financeIncome = [
    { id: 'first', incomeDate: '2083-06-01', amount: 100 },
    { id: 'last', incomeDate: '2083-06-31', amount: 200 },
    { id: 'previous', incomeDate: '2083-05-30', amount: 400 },
    { id: 'next', incomeDate: '2083-07-01', amount: 800 },
  ];
  source.financeExpenses = [{ id: 'expense', expenseDate: '2083-06-10', amount: 50 }, { id: 'undated', amount: 70 }];
  source.financePayments = [{ id: 'cash', paymentDate: '2083-06-10', paymentMethod: 'Cash', amount: 100 }, { id: 'bank', paymentDate: '2083-05-10', paymentMethod: 'Bank', amount: 200 }];
  const data = api.buildFinanceOverviewData(source, '2083-06');
  const monthly = api.filterFinanceOverviewPeriod(data, 'monthly', '2083-06');
  assert.equal(monthly.summary.totalIncome, 300);
  assert.equal(monthly.summary.totalExpenses, 50);
  assert.equal(monthly.summary.netProfit, 250);
  assert.equal(monthly.summary.outstandingAmount, 500);
  assert.equal(monthly.summary.cashBalance, 100);
  assert.equal(monthly.summary.bankBalance, 0);
  assert.equal(monthly.income.length, 2);
  for (const metric of ['income', 'expenses', 'outstanding', 'cash', 'bank']) {
    const key = { income: 'totalIncome', expenses: 'totalExpenses', outstanding: 'outstandingAmount', cash: 'cashBalance', bank: 'bankBalance' }[metric];
    assert.equal(sum(api.financeDetailRows(monthly, metric)), monthly.summary[key]);
  }
  const overall = api.filterFinanceOverviewPeriod(data, 'overall', '2083-06');
  assert.equal(overall.summary.totalIncome, 1500);
  assert.equal(overall.summary.totalExpenses, 120);
  assert.equal(overall.summary.bankBalance, 200);
  assert.equal(data.income.length, 4, 'filtering preserves the subscription data');
});
