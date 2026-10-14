import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { loadEnv } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const source = loadEnv('production', root, 'VITE_FIREBASE_').VITE_FIREBASE_PROJECT_ID;
const target = loadEnv('development', root, 'VITE_FIREBASE_').VITE_FIREBASE_PROJECT_ID;
const [command, backupArgument] = process.argv.slice(2);
if (!['setup', 'backup', 'copy', 'verify', 'copy-auth'].includes(command)) throw new Error('Usage: node scripts/firebase-demo.mjs setup|backup|copy|verify|copy-auth [backup-file]');
if (!source || !target || source === target) throw new Error('Distinct production and demo projects must be configured first.');

// Reuse the locally installed Firebase CLI login. Credentials never enter the
// backup, application bundle, command arguments, or progress output.
const globalModules = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
const cli = createRequire(path.join(globalModules, 'firebase-tools/package.json'));
const auth = cli('./lib/auth.js');
const account = auth.getProjectDefaultAccount(root);
if (!account) throw new Error('Run firebase login before backing up or copying Firestore.');
await cli('./lib/requireAuth.js').requireAuth({ project: source, ...account });
const { Client } = cli('./lib/apiv2.js');
const firestore = new Client({ urlPrefix: 'https://firestore.googleapis.com', apiVersion: 'v1', auth: true });
// Firebase CLI clients mutate request options; never reuse an options object.
const quiet = () => ({ skipLog: { reqBody: true, resBody: true } });
const database = (project) => `projects/${project}/databases/(default)`;
const documentsRoot = (project) => `${database(project)}/documents`;
const encoded = (value) => value.split('/').map(encodeURIComponent).join('/').replaceAll('%3A', ':');
const get = async (url, queryParams) => (await firestore.get(encoded(url), { ...quiet(), queryParams })).body;
const post = async (url, body, queryParams) => (await firestore.post(encoded(url), body, { ...quiet(), queryParams })).body;

if (command === 'copy-auth') {
  const identity = new Client({ urlPrefix: 'https://identitytoolkit.googleapis.com', auth: true });
  const sourceConfig = (await identity.get(`/admin/v2/projects/${source}/config`, quiet())).body;
  const hash = sourceConfig.signIn?.hashConfig ?? sourceConfig.signIn?.email?.hashConfig;
  async function users(project) {
    const result = [];
    let nextPageToken;
    do {
      const response = await identity.get(`/v1/projects/${project}/accounts:batchGet`, { ...quiet(), queryParams: { maxResults: 1000, ...(nextPageToken ? { nextPageToken } : {}) } });
      result.push(...(response.body.users ?? []));
      nextPageToken = response.body.nextPageToken;
    } while (nextPageToken);
    return result;
  }
  const sourceUsers = await users(source);
  if (sourceUsers.some((user) => user.passwordHash) && (!hash?.algorithm || !hash?.signerKey)) throw new Error('Source password hash configuration is not accessible. No accounts were imported.');
  const filename = path.join(root, 'backups', `${source}-${new Date().toISOString().replace(/[:.]/g, '-')}.auth.json`);
  await mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
  await writeFile(filename, JSON.stringify({ sourceProject: source, exportedAt: new Date().toISOString(), users: sourceUsers, hashConfig: hash }, null, 2), { mode: 0o600, flag: 'wx' });
  console.log(`Saved a private backup of ${sourceUsers.length} authentication accounts.`);
  await cli('./lib/ensureApiEnabled.js').ensure(target, 'identitytoolkit.googleapis.com', 'demo authentication');
  let targetConfig;
  try { targetConfig = (await identity.get(`/admin/v2/projects/${target}/config`, quiet())).body; }
  catch (error) {
    if (!/CONFIGURATION_NOT_FOUND|404/.test(String(error.message))) throw error;
    throw new Error(`Initialize Authentication in https://console.firebase.google.com/project/${target}/authentication and enable Email/Password, then rerun copy-auth.`);
  }
  await identity.patch(`/admin/v2/projects/${target}/config`, {
    signIn: { email: { enabled: true, passwordRequired: true } },
    authorizedDomains: [...new Set([...(targetConfig.authorizedDomains ?? []), 'localhost', '127.0.0.1'])],
  }, { ...quiet(), queryParams: { updateMask: 'signIn.email.enabled,signIn.email.passwordRequired,authorizedDomains' } });
  const existing = await users(target);
  const existingById = new Map(existing.map((user) => [user.localId, user]));
  const missing = sourceUsers.filter((user) => !existingById.has(user.localId));
  if (sourceUsers.some((user) => existingById.has(user.localId) && existingById.get(user.localId).email !== user.email) || missing.some((user) => user.email && existing.some((old) => old.email === user.email))) {
    throw new Error('Demo authentication has conflicting users. No existing accounts were overwritten.');
  }
  const fields = ['localId', 'email', 'emailVerified', 'passwordHash', 'salt', 'displayName', 'photoUrl', 'createdAt', 'lastLoginAt', 'phoneNumber', 'disabled', 'customAttributes', 'providerUserInfo', 'mfaInfo'];
  for (let offset = 0; offset < missing.length; offset += 1000) {
    const response = await identity.post(`/v1/projects/${target}/accounts:batchCreate`, {
      users: missing.slice(offset, offset + 1000).map((user) => Object.fromEntries(fields.filter((key) => user[key] !== undefined).map((key) => [key, user[key]]))),
      ...(hash ? { hashAlgorithm: hash.algorithm, signerKey: hash.signerKey, saltSeparator: hash.saltSeparator, rounds: hash.rounds, memoryCost: hash.memoryCost } : {}),
      allowOverwrite: false,
    }, quiet());
    if (response.body.error?.length) throw new Error(`${response.body.error.length} accounts failed to import. Check the demo Authentication console before retrying.`);
  }
  const copied = new Map((await users(target)).map((user) => [user.localId, user]));
  for (const user of sourceUsers) {
    const clone = copied.get(user.localId);
    if (!clone || clone.email !== user.email || Boolean(clone.disabled) !== Boolean(user.disabled) || clone.customAttributes !== user.customAttributes) throw new Error('Authentication verification failed.');
  }
  console.log(`Verified ${sourceUsers.length} authentication accounts in ${target}; email/password sign-in and localhost are enabled.`);
  process.exit(0);
}

if (command === 'setup') {
  const origin = await get(database(source));
  await cli('./lib/ensureApiEnabled.js').ensure(target, 'firestore.googleapis.com', 'demo database');
  let existing;
  try { existing = await get(database(target)); }
  catch (error) { if (error.status !== 404 && error.context?.response?.statusCode !== 404 && !String(error.message).includes('404')) throw error; }
  if (existing) {
    console.log(`Demo database already exists in ${existing.locationId}.`);
  } else {
    let operation = await post(`projects/${target}/databases`, { locationId: origin.locationId, type: 'FIRESTORE_NATIVE', databaseEdition: 'STANDARD' }, { databaseId: '(default)' });
    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      operation = await get(operation.name);
    }
    if (operation.error) throw new Error(operation.error.message);
    console.log(`Created ${target} Firestore in ${origin.locationId}.`);
  }
  process.exit(0);
}

async function collectionIds(parent, readTime) {
  const ids = [];
  let pageToken;
  do {
    const result = await post(`${parent}:listCollectionIds`, { pageSize: 100, ...(pageToken ? { pageToken } : {}), ...(readTime ? { readTime } : {}) });
    ids.push(...(result.collectionIds ?? []));
    pageToken = result.nextPageToken;
  } while (pageToken);
  return ids;
}

async function mapLimit(items, limit, callback) {
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) await callback(items[index++]);
  }));
}

async function readTree(project, readTime) {
  const documents = [];
  async function visitCollection(parent, id) {
    const entries = [];
    let pageToken;
    do {
      const result = await get(`${parent}/${id}`, { pageSize: 300, showMissing: true, ...(readTime ? { readTime } : {}), ...(pageToken ? { pageToken } : {}) });
      entries.push(...(result.documents ?? []));
      pageToken = result.nextPageToken;
    } while (pageToken);
    await mapLimit(entries, 8, async (document) => {
      if (document.createTime || document.updateTime) documents.push(document);
      for (const child of await collectionIds(document.name, readTime)) await visitCollection(document.name, child);
    });
  }
  for (const id of await collectionIds(documentsRoot(project), readTime)) {
    await visitCollection(documentsRoot(project), id);
    console.log(`Read ${id}; ${documents.length} documents so far.`);
  }
  return documents.sort((a, b) => a.name.localeCompare(b.name));
}

if (command === 'backup') {
  const readTime = new Date().toISOString();
  const documents = await readTree(source, readTime);
  const filename = backupArgument || path.join(root, 'backups', `${source}-${readTime.replace(/[:.]/g, '-')}.firestore.json`);
  await mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
  await writeFile(filename, JSON.stringify({ format: 'erp-firestore-rest-backup', version: 1, sourceProject: source, readTime, exportedAt: new Date().toISOString(), documents }, null, 2), { mode: 0o600, flag: 'wx' });
  console.log(`Saved ${documents.length} documents to ${filename}.`);
  process.exit(0);
}

if (!backupArgument) throw new Error('Supply the backup file created by the backup command.');
const backup = JSON.parse(await readFile(backupArgument, 'utf8'));
if (backup.format !== 'erp-firestore-rest-backup' || backup.version !== 1 || backup.sourceProject !== source || !Array.isArray(backup.documents)) throw new Error('This backup does not match the configured production source.');
const from = `${documentsRoot(source)}/`;
const to = `${documentsRoot(target)}/`;
function remap(value) {
  if (Array.isArray(value)) return value.map(remap);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === 'referenceValue' && typeof item === 'string' && item.startsWith(from) ? to + item.slice(from.length) : remap(item)]));
  return value;
}
const expected = backup.documents.filter((document) => {
  if (!document.name.startsWith(from)) throw new Error('Backup contains a document outside its source project.');
  return document.name.slice(from.length).split('/')[0] !== 'mail'; // Do not replay production email jobs.
}).map((document) => ({ name: to + document.name.slice(from.length), fields: remap(document.fields ?? {}) }));

if (command === 'copy') {
  const existing = new Map((await readTree(target)).map((document) => [document.name, document.fields ?? {}]));
  const missing = [];
  for (const document of expected) {
    if (!existing.has(document.name)) missing.push(document);
    else if (!isDeepStrictEqual(existing.get(document.name), document.fields)) throw new Error('Demo contains conflicting records. No records were overwritten; use an empty destination or review the conflicts.');
  }
  for (let offset = 0; offset < missing.length; offset += 100) {
    await post(`${database(target)}/documents:commit`, { writes: missing.slice(offset, offset + 100).map((document) => ({ update: document, currentDocument: { exists: false } })) });
    console.log(`Copied ${Math.min(offset + 100, missing.length)} of ${missing.length} missing documents to ${target}.`);
  }
  console.log(`Copy complete; ${expected.length - missing.length} identical existing documents retained. Run verify with the same backup file.`);
} else {
  const actual = new Map((await readTree(target)).map((document) => [document.name, document.fields ?? {}]));
  let mismatch = 0;
  for (const document of expected) if (!isDeepStrictEqual(actual.get(document.name), document.fields)) mismatch++;
  if (mismatch) throw new Error(`${mismatch} copied documents are missing or differ from the backup.`);
  console.log(`Verified all ${expected.length} copied documents against the backup.`);
}
