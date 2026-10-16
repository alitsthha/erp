// Run against a demo Firestore emulator only; this test never connects to a live project.
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectFirestoreEmulator, doc, getDoc, getDocs, collection, collectionGroup, getFirestore, writeBatch, serverTimestamp } from 'firebase/firestore';

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
const admin = client('color-admin', { sub: 'admin', email: 'admin@academy.edu', admin: true, auth_time: Math.floor(Date.now() / 1000) });
const teacher = client('color-teacher', { sub: 'teacher', email: 'teacher@example.com', permissions: { attendance: true } });
const enrollmentStaff = client('enrollment-staff', { sub: 'enrollment-staff', email: 'enrollment@example.com', permissions: { enrollments: true } });
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

test('activity rename must atomically update the name projection', async () => {
  const stale = writeBatch(admin);
  stale.update(doc(admin, 'activities', 'first'), { activityName: 'Renamed' });
  await assert.rejects(stale.commit(), denied);
  const rename = writeBatch(admin);
  rename.update(doc(admin, 'activities', 'first'), { activityName: 'Renamed' });
  rename.update(doc(admin, 'activity_colors', 'first'), { activityName: 'Renamed' });
  await rename.commit();
  assert.equal((await getDoc(doc(teacher, 'activity_colors', 'first'))).data().activityName, 'Renamed');
});

test('enrollment staff can resolve labels without reading pricing or editing the projection', async () => {
  assert.equal((await getDoc(doc(enrollmentStaff, 'activity_colors', 'first'))).data().activityName, 'Renamed');
  await assert.rejects(getDocs(collection(enrollmentStaff, 'activities')), denied);
  const write = writeBatch(enrollmentStaff);
  write.update(doc(enrollmentStaff, 'activity_colors', 'first'), { activityName: 'Forged' });
  await assert.rejects(write.commit(), denied);
});

test('class entries can store the activity ID without name snapshots', async () => {
  const batch = writeBatch(admin);
  batch.set(doc(admin, 'calendar_entries', 'class-test'), {
    dateBS: '2083-06-25', dateAD: '2026-10-11', type: 'class', title: 'Class',
    activityId: 'first', time: '', notes: '',
  });
  await batch.commit();
  assert.equal((await getDoc(doc(teacher, 'calendar_entries', 'class-test'))).data().activityName, undefined);
});

after(async () => { await Promise.all(apps.map(deleteApp)); });

test('reset marker pauses administrator writes while preserving reads and cannot be removed by clients', async () => {
  const marker = `http://${address}/v1/projects/demo-erp-colors/databases/(default)/documents/_maintenance/databaseReset`;
  const headers = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
  // Emulator-only Admin REST access seeds the marker that client rules cannot write.
  const seed = await fetch(marker, { method: 'PATCH', headers, body: JSON.stringify({ fields: { status: { stringValue: 'running' } } }) });
  assert.equal(seed.ok, true);
  try {
    assert.equal((await getDoc(doc(admin, 'activities', 'first'))).exists(), true);
    const write = writeBatch(admin);
    write.set(doc(admin, 'students', 'blocked'), { fullName: 'Blocked' });
    await assert.rejects(write.commit(), denied);
    const nested = writeBatch(admin);
    nested.set(doc(admin, 'invoices', 'blocked', 'payments', 'blocked'), { amount: 1 });
    await assert.rejects(nested.commit(), denied);
    const removeMarker = writeBatch(admin);
    removeMarker.delete(doc(admin, '_maintenance', 'databaseReset'));
    await assert.rejects(removeMarker.commit(), denied);
  } finally {
    assert.equal((await fetch(marker, { method: 'DELETE', headers })).ok, true);
  }
  const resumed = writeBatch(admin);
  resumed.set(doc(admin, 'students', 'resumed'), { fullName: 'Resumed' });
  await resumed.commit();
});

test('browser reset requires recent admin auth and grants only its owner collection-group deletion access', async () => {
  const readerOnly = client('reset-teacher', { sub: 'reset-teacher', email: 'teacher@example.com', admin: false, role: 'teacher', auth_time: Math.floor(Date.now() / 1000) });
  const roleOnly = client('reset-role-admin', { sub: 'role-admin', email: 'role-admin@example.com', admin: false, role: 'teacher', auth_time: Math.floor(Date.now() / 1000) });
  const expired = client('reset-expired-admin', { sub: 'expired-admin', admin: true, auth_time: 1 });
  const reset = (uid, runId) => ({ mode: 'browser', requestedBy: uid, runId, status: 'running', updatedAt: serverTimestamp() });
  const teacherAttempt = writeBatch(readerOnly);
  teacherAttempt.set(doc(readerOnly, '_maintenance', 'databaseReset'), reset('reset-teacher', 'bad'));
  await assert.rejects(teacherAttempt.commit(), denied);
  const oldSession = writeBatch(expired);
  oldSession.set(doc(expired, '_maintenance', 'databaseReset'), reset('expired-admin', 'bad'));
  await assert.rejects(oldSession.commit(), denied);

  const seed = writeBatch(admin);
  seed.set(doc(admin, 'user_roles', 'role-admin@example.com'), { role: 'admin' });
  seed.set(doc(admin, 'invoices', 'missing-parent', 'payments', 'orphan'), { amount: 1 });
  await seed.commit();
  const acquire = writeBatch(roleOnly);
  acquire.set(doc(roleOnly, '_maintenance', 'databaseReset'), reset('role-admin', 'one'));
  await acquire.commit();
  assert.ok((await getDocs(collectionGroup(roleOnly, 'payments'))).docs.some((item) => item.id === 'orphan'));
  // Even another administrator cannot issue a collection-group delete during a reset.
  const otherDelete = writeBatch(admin);
  otherDelete.delete(doc(admin, 'invoices', 'missing-parent', 'payments', 'orphan'));
  await assert.rejects(otherDelete.commit(), denied);
  const ownerCreate = writeBatch(roleOnly);
  ownerCreate.set(doc(roleOnly, 'students', 'should-not-exist'), { fullName: 'Blocked' });
  await assert.rejects(ownerCreate.commit(), denied);
  const hijack = writeBatch(admin);
  hijack.set(doc(admin, '_maintenance', 'databaseReset'), reset('admin', 'two'));
  await assert.rejects(hijack.commit(), denied);
  const remove = writeBatch(roleOnly);
  remove.update(doc(roleOnly, '_maintenance', 'databaseReset'), { runId: 'one', updatedAt: serverTimestamp() });
  remove.delete(doc(roleOnly, 'invoices', 'missing-parent', 'payments', 'orphan'));
  await remove.commit();
  const finish = writeBatch(roleOnly);
  finish.delete(doc(roleOnly, 'user_roles', 'role-admin@example.com'));
  finish.delete(doc(roleOnly, '_maintenance', 'databaseReset'));
  await finish.commit();
  await assert.rejects(getDocs(collectionGroup(roleOnly, 'payments')), denied);
});
