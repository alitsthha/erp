import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { jsPDF } from 'jspdf';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);

function renderer() {
  const draws = [];
  class Pdf {
    constructor(options) {
      const pdf = new jsPDF(options);
      const addImage = pdf.addImage.bind(pdf);
      pdf.addImage = (image, ...args) => addImage(readFileSync(path.join(root, 'public', image.src)), ...args);
      const text = pdf.text.bind(pdf);
      pdf.text = (value, x, y, ...args) => {
        draws.push({ page: pdf.internal.getCurrentPageInfo().pageNumber, value: Array.isArray(value) ? value.join('\n') : value, x, y, size: pdf.getFontSize() });
        return text(value, x, y, ...args);
      };
      return pdf;
    }
  }
  class Image {
    set src(value) {
      this.source = value;
      const props = new jsPDF().getImageProperties(readFileSync(path.join(root, 'public', value)));
      this.naturalWidth = props.width;
      this.naturalHeight = props.height;
      this.onload();
    }
    get src() { return this.source; }
  }
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, {
      module, exports: module.exports, Image, URL, window: { location: { origin: 'https://school.example' } },
      require: (name) => {
        if (name === 'jspdf') return { __esModule: true, default: Pdf };
        if (name === '@/utils/nepali-date') return { formatBSDate: (value) => value };
        if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`));
        return require(name);
      },
    }, { filename });
    return module.exports;
  }
  return { build: load(path.join(root, 'src/features/finance/services/invoice-pdf.service.ts')).buildInvoicePdf, draws };
}

for (const count of [1, 12, 70]) {
  test(`exports ${count} entries with repeated page branding and an unobstructed footer`, async () => {
    const { build, draws } = renderer();
    const invoice = {
      invoiceNumber: 'INV-TEST', studentName: 'Test student', studentCode: 'S001',
      invoiceDate: '2083-07-01', billingMonth: '2083-07', status: 'Unpaid',
      subtotal: count * 100, totalAmount: count * 100, paidAmount: 0, dueAmount: count * 100, discount: 0,
      lines: Array.from({ length: count }, (_, i) => ({ activityName: `Entry ${i + 1}`, monthlyFee: 100, sessionFee: 100, sessionCount: 1, amount: 100 })),
    };
    const organization = { name: 'Young Explorers Academy', tagline: 'Quality Education', address: 'Baluwatar, Kathmandu, Nepal', phone: '+977-1-4567890', email: 'info@school.example', website: 'www.school.example' };
    const pdf = await build({ invoice, organization, customer: null, pan: '' });
    const pages = pdf.getNumberOfPages();
    if (count === 1) assert.equal(pages, 1);
    if (count === 70) assert.ok(pages > 2);
    for (let page = 1; page <= pages; page++) {
      const items = draws.filter((draw) => draw.page === page);
      assert.ok(items.some((draw) => draw.value === 'INVOICE' && draw.size === 28 && draw.y === 154));
      assert.ok(items.some((draw) => draw.value === organization.phone));
      assert.ok(items.some((draw) => draw.value === organization.address));
      assert.ok(items.some((draw) => draw.value === 'Computer-generated invoice - No signature required'));
      assert.ok(items.some((draw) => draw.value === `Page ${page} of ${pages}`));
      const entries = items.filter((draw) => /^Entry \d+/.test(draw.value));
      for (const entry of entries) {
        assert.ok(entry.y > 200);
        assert.ok(entry.y < pdf.internal.pageSize.getHeight() - 170);
      }
      if (entries.length) assert.ok(items.some((draw) => draw.value === 'ACTIVITY'));
    }
    for (let i = 1; i <= count; i++) assert.equal(draws.filter((draw) => draw.value.startsWith(`Entry ${i}\n`)).length, 1);
    assert.equal(draws.filter((draw) => draw.value === 'BALANCE DUE').length, 1);
  });
}

test('an oversized description continues without losing text or covering the header', async () => {
  const { build, draws } = renderer();
  const words = Array.from({ length: 400 }, (_, i) => `word${i}`);
  const pdf = await build({
    invoice: { invoiceNumber: 'LONG', studentName: 'Student', studentCode: 'S1', invoiceDate: '2083-07-01', billingMonth: '2083-07', status: 'Unpaid', subtotal: 100, totalAmount: 100, paidAmount: 0, dueAmount: 100, discount: 0, lines: [{ activityName: words.join(' '), monthlyFee: 100, sessionFee: 100, sessionCount: 1, amount: 100 }] },
    organization: { name: 'School', tagline: 'Education', address: 'Kathmandu', phone: '123', email: 'mail@example.com', website: 'school.example' }, customer: null, pan: '',
  });
  assert.ok(pdf.getNumberOfPages() > 2);
  const chunks = draws.filter((draw) => /word\d/.test(draw.value));
  const exported = chunks.map((draw) => draw.value).join(' ').match(/word\d+/g);
  assert.deepEqual(exported, words);
  for (const chunk of chunks) {
    assert.ok(chunk.y >= 220);
    assert.ok(chunk.y + (chunk.value.split('\n').length - 1) * 12 < pdf.internal.pageSize.getHeight() - 170);
  }
});
