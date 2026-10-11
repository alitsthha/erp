// Run against a demo Firestore emulator only; this test never connects to a live project.
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectFirestoreEmulator, doc, getDoc, getDocs, collection, getFirestore, writeBatch } from 'firebase/firestore';

const address = process.env.FIRESTORE_EMULATOR_HOST;
if (!address) throw new Error('FIRESTORE_EMULATOR_HOST is required. Run with firebase emulators:exec and a demo project.');
const [host, port] = address.split(':');
if (!['127.0.0.1', 'localhost'].includes(host)) throw new Error('Only a local emulator is allowed.');
const apps = [];
function client(name, token) {
  const app = initializeApp({ projectId: 'demo-erp-colors', apiKey: 'demo-key' }, name);
  apps.push(app);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, host, Number(port), { mockUserToken: token });
  return db;
}
const admin = client('color-admin', { sub: 'admin', email: 'admin@academy.edu', admin: true });
const teacher = client('color-teacher', { sub: 'teacher', email: 'teacher@example.com', permissions: { attendance: true } });
const denied = (error) => error.code === 'permission-denied';
function save(db, id, color, oldColor) {
  const batch = writeBatch(db);
  const data = { activityCode: id, activityName: id, color };
  batch.set(doc(db, 'activities', id), data);
  batch.set(doc(db, 'activity_colors', id), data);
  batch.set(doc(db, 'activity_color_locks', color.slice(1)), { activityId: id });
  if (oldColor) batch.delete(doc(db, 'activity_color_locks', oldColor.slice(1)));
  return batch.commit();
}

test('rules allow a matching activity, color projection and reservation to be created atomically', async () => {
  await save(admin, 'first', '#123456');
  assert.equal((await getDoc(doc(admin, 'activity_colors', 'first'))).data().color, '#123456');
});

test('rules reject missing colors and activity writes without a matching color reservation', async () => {
  const missing = writeBatch(admin);
  missing.set(doc(admin, 'activities', 'missing'), { activityName: 'Missing', activityCode: 'missing' });
  await assert.rejects(missing.commit(), denied);
  const alone = writeBatch(admin);
  alone.set(doc(admin, 'activities', 'alone'), { activityName: 'Alone', activityCode: 'alone', color: '#ABCDEF' });
  await assert.rejects(alone.commit(), denied);
  await assert.rejects(save(admin, 'lowercase', '#abcdef'), denied);
});

test('rules reject competing color owners, permit recoloring and release the prior reservation', async () => {
  await assert.rejects(save(admin, 'second', '#123456'), denied);
  assert.equal((await getDoc(doc(admin, 'activities', 'second'))).exists(), false);
  await save(admin, 'first', '#ABCDEF', '#123456');
  await save(admin, 'second', '#123456');
  assert.equal((await getDoc(doc(admin, 'activity_color_locks', '123456'))).data().activityId, 'second');
});

test('attendance staff can read the palette without activity pricing access and cannot modify colors', async () => {
  const palette = await getDocs(collection(teacher, 'activity_colors'));
  assert.ok(palette.size >= 2);
  await assert.rejects(getDocs(collection(teacher, 'activities')), denied);
  await assert.rejects(save(teacher, 'teacher-write', '#987654'), denied);
});

after(async () => { await Promise.all(apps.map(deleteApp)); });
