# Browser-based ERP reset (no Cloud Functions)

Use **Settings → Database Management → Clear database**. The browser connects
straight to Firestore using the signed-in administrator's Firebase identity.
Cloud Functions, a local backend, and a Blaze upgrade are not required. Firestore
read/delete quotas still apply; quota exhaustion is reported rather than skipped.

The dialog requires `DELETE <connected-project-id>` and the administrator's
password. It refreshes authentication before acquiring `_maintenance/databaseReset`.
Rules permit only a recently authenticated administrator to start a reset. The
owner can read and delete data while ordinary writes remain blocked. No API keys
with administrative privileges or service-account secrets are put in the browser.

`RESET_COLLECTIONS` in `database-reset.service.ts` lists every collection ID used
by the ERP. Collection-group queries include nested payments and records whose
parents no longer exist. The service preflights every group with server reads,
then deletes at most 200 documents per batch. Each batch atomically renews the
owner's lock. Saved roles are deleted last; lock ownership preserves the ability
to finish after the administrator's role document is removed. Every listed group
is verified empty before releasing the lock and showing success.

This clears all ERP-managed data, including settings, colors, payment idempotency
keys, counters, and audit records. It does **not** discover collection names added
outside the ERP: Firebase's browser SDK cannot list arbitrary collections. Keep
`RESET_COLLECTIONS` updated when adding collections or subcollections. Authentication
accounts/custom claims, Storage files, indexes, and rules are unchanged. The UI
states this scope explicitly. The existing Backup & Restore covers only its own
listed sections and is not a full recovery export.

Keep the tab open. Failed resets retain the pause and can be retried immediately
with confirmation/password. If the browser disconnects before recording failure,
wait five minutes for the lease to expire, then retry. Reset deletes are idempotent;
no success is shown for offline, denied, or failed reads. After success, reload the
application to discard previously loaded records. Admin access based solely on a
`user_roles` document is removed along with that document.

Deploy the rules to the same project used by the app before trying this version:

```sh
firebase deploy --project demoerp-b1895 --only firestore:rules
```

Local Vite development picks up the new client code. For a hosted app, build and
deploy its frontend too. No Functions deployment is needed for this reset. Existing
server callables, if used, retain the reset guard; external Admin SDK jobs bypass
rules and should be stopped before clearing.

`node --test tests/database-reset.test.mjs` tests the browser service with an
isolated Firestore double. Rules integration tests use only a local emulator in
`tests/activity-color-rules.integration.mjs`.
