import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
function load(file, mocks, cache = new Map()) {
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
      return load(existsSync(`${target}.ts`) ? `${target}.ts` : target, mocks, cache);
    }
    return require(specifier);
  };
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, console, Error, Date, Image: class { set src(_value) { this.onerror?.(); } } }, { filename });
  return module.exports;
}

function database(initial = {}, today = '2083-12-01') {
  const records = new Map(Object.entries(initial));
  let sequence = 0;
  let lockRace = false;
  let raceAdvance = null;
  const ref = (value) => ({ path: value, id: value.split('/').at(-1) });
  const snapshot = (reference) => ({ id: reference.id, ref: reference, exists: () => records.has(reference.path), data: () => records.get(reference.path) });
  const firestore = {
    collection: (_db, ...parts) => ref(parts.join('/')),
    doc: (parent, ...parts) => ref(parts.length ? parts.join('/') : `${parent.path}/generated-${++sequence}`),
    where: (field, op, value) => ({ field, op, value }),
    query: (reference, ...filters) => ({ ...reference, filters }),
    orderBy: () => ({}),
    getDoc: async (reference) => snapshot(reference),
    getDocs: async (reference) => {
      const docs = [...records.keys()].filter((key) => key.startsWith(`${reference.path}/`))
        .filter((key) => (reference.filters ?? []).every(({ field, op, value }) => !field || (op === ">=" ? records.get(key)[field] >= value : op === "<=" ? records.get(key)[field] <= value : records.get(key)[field] === value)))
        .map((key) => snapshot(ref(key)));
      return { docs, forEach: (callback) => docs.forEach(callback) };
    },
    serverTimestamp: () => 'server-time',
    runTransaction: async (_db, callback) => {
      const mutations = [];
      let writing = false;
      const result = await callback({
        get: async (reference) => {
          assert.equal(writing, false, 'Firestore transactions must read before writing');
          if (lockRace && reference.path.startsWith('invoiceLocks/')) {
            records.set(reference.path, { studentId: 's1', generation: 99 });
            lockRace = false;
          }
          if (raceAdvance && reference.path === raceAdvance.path) {
            records.set(reference.path, { ...records.get(reference.path), ...raceAdvance.data });
            raceAdvance = null;
          }
          return snapshot(reference);
        },
        set: (reference, value) => { writing = true; mutations.push(() => records.set(reference.path, value)); },
        update: (reference, value) => { writing = true; mutations.push(() => records.set(reference.path, { ...records.get(reference.path), ...value })); },
      });
      mutations.forEach((mutation) => mutation());
      return result;
    },
  };
  const mocks = { 'firebase/firestore': firestore, '@/firebase/config': { db: {} }, '@/utils/calendar-date': { getKathmanduToday: () => ({ bs: today }) } };
  return {
    records,
    fees: load('src/features/finance/services/fee-calculation.service.ts', mocks),
    invoices: load('src/features/finance/services/invoice.service.ts', mocks),
    history: load('src/features/finance/services/billing-history.service.ts', mocks),
    raceGeneration: () => { lockRace = true; },
    raceAdvance: (path, data) => { raceAdvance = { path, data }; },
  };
}
const enrollment = { studentId: 's1', studentName: 'Test Student', studentCode: 'ST1', activityId: 'a1', activityName: 'Music', status: 'Active', countedMonthly: false, sessionFee: 100, monthlyFee: 1000, expectedSessionsPerMonth: 10, enrollmentDate: '2083-05-01' };
const attendance = (date, overrides = {}) => ({ studentId: 's1', enrollmentId: 'e1', activityId: 'a1', sessionDateBS: date, status: 'Present', ...overrides });
const options = (day = '12', extra = {}) => ({ invoiceDate: `2083-06-${day}`, billingDate: `2083-06-${day}`, ...extra });
const calculate = (db, day = '12', extra = {}) => db.fees.calculateStudentMonthlyFee('s1', '2083-06', options(day, extra));
const generate = (db, day = '12', extra = {}) => db.invoices.createInvoiceFromStudentFee('s1', '2083-06', options(day, extra));

// Actual service calls run against an isolated transaction-aware Firestore double.
test('repeat generation bills only new attendance and accounts for payments through the inclusive cutoff', async () => {
  const db = database({ 'enrollments/e1': enrollment, 'attendances/a1': attendance('2083-06-02'), 'attendances/a2': attendance('2083-06-08'), 'attendances/future': attendance('2083-06-20') });
  const id = await generate(db, '10');
  assert.equal(db.records.get(`invoices/${id}`).totalAmount, 200);
  db.records.set('financePayments/p1', { invoiceId: id, amount: 60, paymentDate: '2083-06-12' }); // legacy receipt without studentId/status
  db.records.set('financePayments/p2', { invoiceId: id, amount: 40, paymentDate: '2083-06-13', status: 'paid' });
  db.records.set('financePayments/cancelled', { invoiceId: id, amount: 500, paymentDate: '2083-06-10', status: 'cancelled' });
  db.records.set('financePayments/pending', { invoiceId: id, amount: 500, paymentDate: '2083-06-10', status: 'pending' });
  db.records.set('financePayments/deleted', { invoiceId: id, amount: 500, paymentDate: '2083-06-10', deletedAt: 'deleted' });
  db.records.set('financePayments/other', { invoiceId: 'other', studentId: 'other', amount: 500, paymentDate: '2083-06-10' });
  let summary = await calculate(db);
  assert.equal(summary.paidThroughDate, 60);
  assert.equal(summary.previousBalance, 140);
  assert.equal(summary.totalAmount, 0);
  await assert.rejects(generate(db), /No new fees/);
  db.records.set('attendances/new', attendance('2083-06-12'));
  summary = await calculate(db);
  assert.equal(summary.grossAmount, 300);
  assert.equal(summary.previouslyBilledAmount, 200);
  assert.equal(summary.totalAmount, 100);
  const next = await generate(db);
  assert.notEqual(id, next);
  assert.equal(db.records.get(`invoices/${next}`).totalAmount, 100);
  assert.deepEqual([...db.records.get(`invoices/${next}`).lines[0].attendanceIds], ['new']);
  assert.equal(db.records.get(`invoices/${id}`).totalAmount, 200, 'original invoice stays intact');
  assert.equal((await calculate(db)).totalAmount, 0);
  assert.equal((await calculate(db, '20')).totalAmount, 100);
});

test('advances are dated payments and preserve the full new invoice total', async () => {
  const db = database({
    'enrollments/e1': enrollment, 'attendances/a1': attendance('2083-06-02'),
    'financeIncome/advance': { studentId: 's1', category: 'Student Fee (Advance)', amount: 80, appliedAmount: 20, incomeDate: '2083-06-12' },
    'financeIncome/later': { studentId: 's1', category: 'Student Fee (Advance)', amount: 900, incomeDate: '2083-06-13' },
    'financeIncome/deleted': { studentId: 's1', category: 'Student Fee (Advance)', amount: 900, incomeDate: '2083-06-01', deletedAt: 'deleted' },
    'financeIncome/other': { studentId: 's2', category: 'Student Fee (Advance)', amount: 900, incomeDate: '2083-06-01' },
  });
  assert.equal((await calculate(db)).availableAdvance, 60);
  const id = await generate(db, '12', { discount: 10 });
  const invoice = db.records.get(`invoices/${id}`);
  assert.equal(invoice.subtotal, 100);
  assert.equal(invoice.totalAmount, 90);
  assert.equal(invoice.paidAmount, 60);
  assert.equal(invoice.dueAmount, 30);
  assert.equal(invoice.status, 'Partially Paid');
  assert.equal(db.records.get('financeIncome/advance').appliedAmount, 80);
  assert.equal(db.records.get('financeIncome/later').appliedAmount, undefined);
  const summary = await calculate(db);
  assert.equal(summary.previousInvoiceTotal, 90);
  assert.equal(summary.paidThroughDate, 60);
  assert.equal(summary.previousBalance, 30);
  assert.equal(summary.availableAdvance, 0);
});

test('fully covering advances mark the invoice paid and retain unused credit', async () => {
  const db = database({ 'enrollments/e1': enrollment, 'attendances/a1': attendance('2083-06-02'), 'financeIncome/advance': { studentId: 's1', category: 'Student Fee (Advance)', amount: 150, incomeDate: '2083-06-01' } });
  const id = await generate(db);
  const invoice = db.records.get(`invoices/${id}`);
  assert.equal(invoice.totalAmount, 100);
  assert.equal(invoice.paidAmount, 100);
  assert.equal(invoice.dueAmount, 0);
  assert.equal(invoice.status, 'Paid');
  assert.equal((await calculate(db)).availableAdvance, 50);
});

test('monthly fees are reserved across overlapping periods, even on unpaid invoices', async () => {
  const db = database({ 'enrollments/e1': { ...enrollment, countedMonthly: true } });
  await generate(db);
  const future = { invoiceDate: '2083-07-12', billingDate: '2083-07-12', startMonth: '2083-06', months: 2 };
  const summary = await db.fees.calculateStudentMonthlyFee('s1', '2083-07', future);
  assert.equal(summary.grossAmount, 2000);
  assert.equal(summary.previouslyBilledAmount, 1000);
  assert.equal(summary.totalAmount, 1000);
  assert.equal(summary.previousBalance, 1000);
  const id = await db.invoices.createInvoiceFromStudentFee('s1', '2083-07', future);
  assert.deepEqual([...db.records.get(`invoices/${id}`).lines[0].billedMonths], ['2083-07']);
  assert.equal((await db.fees.calculateStudentMonthlyFee('s1', '2083-07', future)).totalAmount, 0);
});

test('legacy paid invoices reserve their monthly fees and attendance without copying payment to a new invoice', async () => {
  const db = database({
    'enrollments/e1': enrollment,
    'attendances/a1': attendance('2083-06-01'), 'attendances/a2': attendance('2083-06-02'), 'attendances/a3': attendance('2083-06-03'),
    'invoices/legacy': { studentId: 's1', invoiceDate: '2083-06-02', billingMonth: '2083-06', totalAmount: 150, advanceApplied: 50, status: 'Paid', lines: [{ enrollmentId: 'e1', sessionCount: 2, amount: 200 }] },
    'financePayments/receipt': { invoiceId: 'legacy', amount: 150, paymentDate: '2083-06-02' },
  });
  const summary = await calculate(db);
  assert.equal(summary.totalAmount, 100);
  assert.equal(summary.previousInvoiceTotal, 200);
  assert.equal(summary.paidThroughDate, 200);
  assert.equal(summary.previousBalance, 0);
  const id = await generate(db);
  assert.equal(db.records.get(`invoices/${id}`).paidAmount, 0);
  assert.equal(db.records.get(`invoices/${id}`).dueAmount, 100);
  const monthly = database({
    'enrollments/e1': { ...enrollment, countedMonthly: true },
    'invoices/legacy': { studentId: 's1', invoiceDate: '2083-07-02', billingMonth: '2083-07', status: 'Paid', totalAmount: 2000, lines: [{ enrollmentId: 'e1', countedMonthly: true, monthlyFee: 1000, monthlyFeeAmount: 2000, amount: 2000 }] },
  });
  assert.equal((await calculate(monthly)).totalAmount, 0, 'future invoice reservations also prevent duplicate backdated billing');
});

test('cancelled/deleted invoices release fee events and deleted/absent attendance is excluded', async () => {
  for (const state of [{ status: 'Cancelled' }, { deletedAt: 'deleted' }]) {
    const db = database({
      'enrollments/e1': enrollment,
      'attendances/a1': attendance('2083-06-01'),
      'attendances/a2': attendance('2083-06-01', { status: 'Absent' }),
      'attendances/a3': attendance('2083-06-01', { deletedAt: 'deleted' }),
      'invoices/old': { studentId: 's1', invoiceDate: '2083-06-01', billingMonth: '2083-06', totalAmount: 100, lines: [{ enrollmentId: 'e1', attendanceIds: ['a1'], amount: 100 }], ...state },
    });
    const summary = await calculate(db);
    assert.equal(summary.totalAmount, 100);
    assert.equal(summary.previousInvoiceTotal, 0);
  }
});

test('AD dates normalize and same-day receipts count while later dates do not', () => {
  const db = database();
  const bs = db.history.billingDateKey('2026-10-14');
  assert.match(bs, /^2083-/);
  assert.equal(db.history.receivedBy('2026-10-14', bs), true);
  assert.equal(db.history.receivedBy('2026-10-15', bs), false);
  assert.equal(db.history.receivedBy('', bs), false);
  assert.equal(db.history.receivedBy('invalid', bs), false);
});

test('a concurrent generation aborts without consuming an advance or saving duplicate fees', async () => {
  const db = database({ 'enrollments/e1': enrollment, 'attendances/a1': attendance('2083-06-02'), 'financeIncome/advance': { studentId: 's1', category: 'Student Fee (Advance)', amount: 100, incomeDate: '2083-06-01' } });
  db.raceGeneration();
  await assert.rejects(generate(db), /Another invoice was generated/);
  assert.equal([...db.records.keys()].filter((key) => key.startsWith('invoices/')).length, 0);
  assert.equal(db.records.get('financeIncome/advance').appliedAmount, undefined);
});

test('advance eligibility is rechecked inside the transaction', async () => {
  for (const change of [{ incomeDate: '2083-06-13' }, { appliedAmount: 100 }, { studentId: 's2' }, { category: 'Student Fee' }]) {
    const db = database({ 'enrollments/e1': enrollment, 'attendances/a1': attendance('2083-06-02'), 'financeIncome/advance': { studentId: 's1', category: 'Student Fee (Advance)', amount: 100, incomeDate: '2083-06-01' } });
    db.raceAdvance('financeIncome/advance', change);
    const id = await generate(db);
    assert.equal(db.records.get(`invoices/${id}`).paidAmount, 0);
    assert.equal(db.records.get(`invoices/${id}`).dueAmount, 100);
  }
});

test('legacy multi-month attendance invoices recover their coverage from creation month', async () => {
  const db = database({
    'enrollments/e1': enrollment,
    'attendances/a1': attendance('2083-06-10'),
    'attendances/a2': attendance('2083-07-10'),
    'invoices/legacy': { studentId: 's1', invoiceDate: '2083-07-12', billingMonth: '2083-07', totalAmount: 200, createdAt: { toDate: () => new Date('2026-10-01T10:00:00Z') }, lines: [{ enrollmentId: 'e1', sessionCount: 2, amount: 200 }] },
  });
  const summary = await db.fees.calculateStudentMonthlyFee('s1', '2083-07', { billingDate: '2083-07-12', startMonth: '2083-06', months: 2 });
  assert.equal(summary.totalAmount, 0);
  assert.equal(summary.previouslyBilledAmount, 200);
});

test('calendar counts distinct held dates, including absences, only for the enrolled activity and billing range', async () => {
  const db = database({
    'enrollments/e1': { ...enrollment, enrollmentDate: '2083-06-02' },
    'attendances/before': attendance('2083-06-01'),
    'attendances/present': attendance('2083-06-02'),
    'attendances/duplicate': attendance('2083-06-02'),
    'attendances/absent': attendance('2083-06-03', { status: 'Absent' }),
    'attendances/other-student': attendance('2083-06-04', { studentId: 's2', enrollmentId: 'e2' }),
    'attendances/other-activity': attendance('2083-06-05', { activityId: 'a2', studentId: 's2', enrollmentId: 'e3' }),
    'attendances/later': attendance('2083-06-13'),
    'attendances/deleted': attendance('2083-06-06', { deletedAt: 'deleted' }),
    'calendar_entries/planned': { dateBS: '2083-06-07', activityId: 'a1', type: 'class' },
  });
  const summary = await calculate(db);
  assert.equal(summary.lines[0].takenSessions, 1);
  assert.equal(summary.lines[0].heldSessions, 3);
  assert.equal(summary.totalAmount, 100);
  const id = await generate(db);
  const line = db.records.get(`invoices/${id}`).lines[0];
  assert.equal(line.takenSessions, 1);
  assert.equal(line.heldSessions, 3);
  assert.equal(line.sessionCount, 1);
  assert.deepEqual([...line.attendanceDates], ['2083-06-02']);
  assert.equal((await calculate(db)).totalAmount, 0, 'duplicate record IDs cannot charge the date twice');
});

test('legacy daily attendance uses the calendar fallback and stays reserved when individual records replace it', async () => {
  const db = database({
    'enrollments/e1': enrollment,
    'daily_attendances/day1': { sessionDateBS: '2083-06-02', attendances: [attendance('', { sessionDateBS: undefined })] },
    'daily_attendances/day2': { sessionDateBS: '2083-06-03', attendances: [attendance('2083-06-03')] },
    'attendances/absent': attendance('2083-06-03', { status: 'Absent' }),
    'attendances/deleted': attendance('2083-06-04', { deletedAt: 'deleted' }),
    'daily_attendances/deleted': { sessionDateBS: '2083-06-04', attendances: [attendance('2083-06-04')] },
  });
  let summary = await calculate(db);
  assert.equal(summary.lines[0].takenSessions, 1, 'individual absent mark takes precedence over daily present mark');
  assert.equal(summary.lines[0].heldSessions, 2);
  const id = await generate(db);
  assert.equal(db.records.get(`invoices/${id}`).totalAmount, 100);
  db.records.set('attendances/replacement', attendance('2083-06-02'));
  summary = await calculate(db);
  assert.equal(summary.totalAmount, 0, 'same class with a new record ID must not be rebilled');
});

test('future logged attendance is not a happened class even when billing ahead', async () => {
  const db = database({
    'enrollments/e1': enrollment,
    'attendances/today': attendance('2083-06-28'),
    'attendances/future': attendance('2083-07-02'),
  }, '2083-06-28');
  const summary = await db.fees.calculateStudentMonthlyFee('s1', '2083-07', {
    billingDate: '2083-07-12', startMonth: '2083-06', months: 2,
  });
  assert.equal(summary.lines[0].takenSessions, 1);
  assert.equal(summary.lines[0].heldSessions, 1);
  assert.equal(summary.totalAmount, 100);
});

test('invoice quantities show billed months and calendar counts with new session charges distinguished', async () => {
  const display = load('src/features/finance/components/invoice-document.ts', {});
  const db = database({ 'enrollments/e1': { ...enrollment, countedMonthly: true } });
  const oneMonth = (await calculate(db)).lines[0];
  assert.equal(display.billingLineQuantity(oneMonth), '1 month');
  assert.equal(display.billingLineRate(oneMonth), 1000);
  const twoMonths = await db.fees.calculateStudentMonthlyFee('s1', '2083-07', {
    billingDate: '2083-07-12', startMonth: '2083-06', months: 2,
  });
  assert.equal(display.billingLineQuantity(twoMonths.lines[0]), '2 months');
  assert.equal(twoMonths.totalAmount, 2000);
  await generate(db);
  const overlapping = await db.fees.calculateStudentMonthlyFee('s1', '2083-07', {
    billingDate: '2083-07-12', startMonth: '2083-06', months: 2,
  });
  assert.equal(display.billingLineQuantity(overlapping.lines[0]), '1 month', 'only the newly billed month is shown');
  assert.equal(display.billingLineQuantity({ monthlyFee: 1000, monthlyFeeAmount: 2000, countedMonthly: true }), '2 months', 'legacy monthly invoices derive quantity from their saved amount');
  assert.equal(display.billingLineQuantity({ sessionCount: 3, expectedSessions: 10 }), '3 sessions', 'legacy expected count is not shown as held');
  assert.equal(display.billingLineQuantity({ takenSessions: 4, heldSessions: 6, sessionCount: 1 }), '4 / 6');
  assert.equal(display.billingLineDetail({ takenSessions: 4, heldSessions: 6, sessionCount: 1 }), 'Taken / held; 1 session billed');
});

test('calendar counts span the selected months and preserve the same session on subsequent bills', async () => {
  const db = database({
    'enrollments/e1': enrollment,
    'attendances/old': attendance('2083-05-04'),
    'attendances/new': attendance('2083-06-04'),
    'attendances/missed': attendance('2083-05-05', { status: 'Absent' }),
  });
  const first = await generate(db);
  const next = await generate(db, '12', { startMonth: '2083-05', months: 2 });
  const original = db.records.get(`invoices/${first}`).lines[0];
  const line = db.records.get(`invoices/${next}`).lines[0];
  assert.equal(original.heldSessions, 1);
  assert.equal(line.takenSessions, 2);
  assert.equal(line.heldSessions, 3);
  assert.equal(line.sessionCount, 1);
  assert.equal(line.amount, 100);
});

test('PDF exports the same calendar counts, monthly quantities and rates as the invoice preview', async () => {
  const { buildInvoicePdf } = load('src/features/finance/services/invoice-pdf.service.ts', {});
  const pdf = await buildInvoicePdf({
    invoice: {
      invoiceNumber: 'TEST-1', studentName: 'Test Student', studentCode: 'ST1', status: 'Unpaid',
      invoiceDate: '2083-06-12', billingMonth: '2083-06',
      subtotal: 2100, totalAmount: 2100, discount: 0, paidAmount: 0, dueAmount: 2100,
      lines: [
        { activityName: 'Music', takenSessions: 4, heldSessions: 6, sessionCount: 1, sessionFee: 100, amount: 100 },
        { activityName: 'Art', countedMonthly: true, billedMonths: ['2083-05', '2083-06'], monthlyFee: 1000, sessionFee: 999, amount: 2000 },
      ],
    },
    customer: null, pan: '',
    organization: { name: 'Academy', tagline: '', phone: '', email: '', website: '', address: '' },
  });
  const output = pdf.output();
  assert.match(output, /4 \/ 6/);
  assert.match(output, /2 months/);
  assert.match(output, /NPR 1,000.00/);
  assert.doesNotMatch(output, /NPR 999.00/);
});

test('a bill issued on next month day 4 can charge only the selected previous monthly fee', async () => {
  const db = database({ 'enrollments/e1': { ...enrollment, countedMonthly: true } });
  const selection = { e1: { included: true, months: ['2083-06'], attendanceDates: [] } };
  const id = await db.invoices.createInvoiceFromStudentFee('s1', '2083-07', {
    invoiceDate: '2083-07-04', billingDate: '2083-07-04', startMonth: '2083-06', months: 2, selection,
  });
  const invoice = db.records.get(`invoices/${id}`);
  assert.equal(invoice.invoiceDate, '2083-07-04');
  assert.equal(invoice.totalAmount, 1000);
  assert.deepEqual([...invoice.lines[0].billedMonths], ['2083-06']);
  const remaining = await db.fees.calculateStudentMonthlyFee('s1', '2083-07', { billingDate: '2083-07-04', startMonth: '2083-06', months: 2 });
  assert.equal(remaining.totalAmount, 1000);
  assert.deepEqual([...remaining.lines[0].billedMonths], ['2083-07']);
});

test('issue date does not extend the fee period and payments still count through issue date', async () => {
  const db = database({
    'enrollments/e1': { ...enrollment, countedMonthly: true },
    'financeIncome/advance': { studentId: 's1', category: 'Student Fee (Advance)', amount: 200, incomeDate: '2083-07-03' },
    'financeIncome/future': { studentId: 's1', category: 'Student Fee (Advance)', amount: 900, incomeDate: '2083-07-05' },
    'invoices/old': { studentId: 's1', invoiceDate: '2083-05-12', billingMonth: '2083-05', totalAmount: 500, lines: [] },
    'financePayments/receipt': { invoiceId: 'old', amount: 100, paymentDate: '2083-07-03' },
  });
  const summary = await calculate(db, '28', { paymentDate: '2083-07-04' });
  assert.equal(summary.totalAmount, 1000);
  assert.equal(summary.paidThroughDate, 100);
  assert.equal(summary.availableAdvance, 200);
  const id = await generate(db, '28', { invoiceDate: '2083-07-04' });
  const invoice = db.records.get(`invoices/${id}`);
  assert.equal(invoice.billingMonth, '2083-06');
  assert.equal(invoice.billingDate, '2083-06-28');
  assert.equal(invoice.totalAmount, 1000);
  assert.equal(invoice.paidAmount, 200);
  assert.equal(invoice.dueAmount, 800);
  assert.equal(db.records.get('financeIncome/future').appliedAmount, undefined);
});

test('edited session dates and excluded activities save exactly the selected charges and leave the rest unbilled', async () => {
  const db = database({
    'enrollments/e1': enrollment,
    'enrollments/e2': { ...enrollment, activityId: 'a2', countedMonthly: true },
    'attendances/first': attendance('2083-06-02'),
    'attendances/skipped': attendance('2083-06-03'),
    'attendances/last': attendance('2083-06-04'),
  });
  const selection = {
    e1: { included: true, months: [], attendanceDates: ['2083-06-04', '2083-06-02'] },
    e2: { included: false, months: ['2083-06'], attendanceDates: [] },
  };
  const summary = await calculate(db, '12', { selection });
  assert.equal(summary.totalAmount, 200);
  assert.equal(summary.lines[0].takenSessions, 3);
  assert.equal(summary.lines[0].attendedSessions, 2);
  const id = await generate(db, '12', { selection });
  const invoice = db.records.get(`invoices/${id}`);
  assert.equal(invoice.lines.length, 1);
  assert.equal(invoice.totalAmount, 200);
  assert.deepEqual([...invoice.lines[0].attendanceIds], ['first', 'last']);
  assert.deepEqual([...invoice.lines[0].attendanceDates], ['2083-06-02', '2083-06-04']);
  const remaining = await calculate(db);
  assert.equal(remaining.totalAmount, 1100);
  assert.deepEqual([...remaining.lines[0].attendanceIds], ['skipped']);
});

test('stale selections are rejected if a chosen charge was billed, removed or falls outside the period', async () => {
  for (const scenario of ['already-billed', 'removed', 'outside-period', 'missing-enrollment']) {
    const db = database({ 'enrollments/e1': enrollment, 'attendances/first': attendance('2083-06-02') });
    const selection = { e1: { included: true, months: [], attendanceDates: ['2083-06-02'] } };
    if (scenario === 'already-billed') await generate(db);
    if (scenario === 'removed') db.records.delete('attendances/first');
    if (scenario === 'outside-period') selection.e1.attendanceDates = ['2083-07-01'];
    if (scenario === 'missing-enrollment') db.records.delete('enrollments/e1');
    const countBefore = [...db.records.keys()].filter((key) => key.startsWith('invoices/')).length;
    await assert.rejects(generate(db, '12', { selection }), /Selected charges have changed/);
    assert.equal([...db.records.keys()].filter((key) => key.startsWith('invoices/')).length, countBefore);
  }
});

test('explicit selections do not silently add attendance recorded after preview or charge duplicated selections', async () => {
  const db = database({ 'enrollments/e1': enrollment, 'attendances/first': attendance('2083-06-02') });
  const { defaultBillingSelection } = load('src/features/finance/services/billing-selection.service.ts', {});
  const selection = defaultBillingSelection(await calculate(db));
  selection.e1.attendanceDates.push('2083-06-02');
  db.records.set('attendances/added', attendance('2083-06-03'));
  const id = await generate(db, '12', { selection });
  assert.equal(db.records.get(`invoices/${id}`).totalAmount, 100);
  assert.equal((await calculate(db)).totalAmount, 100);
});

test('deselecting all charges updates totals to zero and prevents an empty invoice', async () => {
  const db = database({ 'enrollments/e1': { ...enrollment, countedMonthly: true } });
  for (const selection of [{}, { e1: { included: true, months: [], attendanceDates: [] } }]) {
    const summary = await calculate(db, '12', { selection });
    assert.equal(summary.totalAmount, 0);
    assert.equal(summary.monthlyFeeTotal, 0);
    assert.equal(summary.sessionFeeTotal, 0);
    await assert.rejects(generate(db, '12', { selection }), /no new monthly fees/i);
  }
  assert.equal((await calculate(db)).totalAmount, 1000);
});

test('charge editor controls change the chosen months, session quantity and included activities', async () => {
  const Editor = load('src/features/finance/components/BillingChargeEditor.tsx', {}).default;
  const { defaultBillingSelection, applyBillingSelection } = load('src/features/finance/services/billing-selection.service.ts', {});
  const db = database({
    'enrollments/e1': enrollment,
    'enrollments/e2': { ...enrollment, activityName: 'Art', activityId: 'a2', countedMonthly: true },
    'attendances/first': attendance('2083-06-02'),
    'attendances/second': attendance('2083-06-03'),
  });
  const summary = await db.fees.calculateStudentMonthlyFee('s1', '2083-07', { billingDate: '2083-07-04', startMonth: '2083-06', months: 2 });
  let selection = defaultBillingSelection(summary);
  function inputs() {
    const tree = Editor({ summary, selection, onChange: (value) => { selection = value; }, disabled: false });
    const found = [];
    const visit = (node) => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== 'object') return;
      if (node.type === 'input') found.push(node);
      visit(node.props?.children);
    };
    visit(tree);
    return found;
  }
  inputs().find((node) => node.props.type === 'number').props.onChange({ target: { value: '1' } });
  assert.equal(applyBillingSelection(summary, selection).totalAmount, 2100);
  // The final checkbox is the last monthly charge (2083-07).
  inputs().at(-1).props.onChange({ target: { checked: false } });
  assert.equal(applyBillingSelection(summary, selection).totalAmount, 1100);
  inputs()[0].props.onChange({ target: { checked: false } });
  assert.equal(applyBillingSelection(summary, selection).totalAmount, 1000);
  const html = require('react-dom/server').renderToStaticMarkup(require('react').createElement(Editor, {
    summary, selection, onChange: () => {}, disabled: false,
  }));
  assert.match(html, /Choose charges for this invoice/);
  assert.match(html, /Choose session dates/);
  assert.match(html, /Kartik/);
});

test('generated invoices store activity references and keep charges fixed across renames', async () => {
  const db = database({
    'activities/a1': { activityName: 'Correct Name', activityCode: 'AC1', feePerSession: 999 },
    'enrollments/e1': { ...enrollment, activityName: 'Typo' },
    'attendances/r1': attendance('2083-06-02'),
  });
  const summary = await calculate(db);
  assert.equal(summary.lines[0].activityName, 'Correct Name');
  assert.equal(summary.totalAmount, 100);
  const id = await generate(db);
  const stored = db.records.get(`invoices/${id}`);
  assert.equal(stored.lines[0].activityId, 'a1');
  assert.equal(stored.lines[0].activityName, undefined);
  assert.equal(stored.lines[0].activityCode, undefined);
  db.records.set('activities/a1', { activityName: 'Renamed Again', activityCode: 'AC1', feePerSession: 5000 });
  const invoice = await db.invoices.getInvoiceById(id);
  assert.equal(invoice.lines[0].activityName, 'Renamed Again');
  assert.equal(invoice.lines[0].sessionFee, 100);
  assert.equal(invoice.totalAmount, 100);
  assert.equal((await calculate(db)).totalAmount, 0);
});
