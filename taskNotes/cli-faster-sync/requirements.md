# Requirements — Faster CLI Uploads & Downloads

## Goal

Make the CLI noticeably faster for the everyday cases: re-running `sync` when
little or nothing has changed, and downloading several extensions at once.

## Background / Problem

- **Uploads:** Every `sync` re-uploads *all* configs with full content, and does
  it twice (a mandatory dry-run preview, then the apply). When nothing has
  changed, the user still pays for two full uploads. This is the main pain.
- **Downloads:** Extensions can only be downloaded one at a time.

---

## Part 1 — Faster Uploads (`sync`)

### Skip unchanged configs
- The CLI remembers what it last synced, on a per-machine basis.
- On each `sync`, it compares the current local configs against that memory and
  **only sends the configs that actually changed** (new or modified), with their
  full content. Unchanged configs are not sent at all.
- "Changed" must account for **skill companion files** too — if any file inside a
  skill changes (including binary/asset files), the skill counts as changed.
  (Today's behavior misses some companion-file changes; this must be correct.)

### Instant "up to date"
- When the local comparison shows **zero changes**, the CLI prints an "up to
  date" result **immediately, with no server round-trip** — no dry-run, no apply.

### Preview behavior
- When there *are* changes, keep the existing preview → confirm → apply flow, but
  the preview/apply only involve the changed configs.

### Server-side speed
- For whatever configs do get sent, the server should apply them more
  efficiently than today (it currently writes records and uploads skill files one
  at a time, and scans more data than needed to find the user's configs). The
  outcome: applying a batch of changes should scale with the number of *changed*
  items, not the size of the whole account.

### Safety valve for drift
- Because the "skip unchanged" decision trusts local memory, the user needs a way
  to override it. A **force/full flag** must ignore the local memory, do a real
  comparison against the server, apply as needed, and rebuild the local memory
  from the result.
- This covers the case where the server was changed elsewhere (another machine or
  the web UI) and local memory is stale.

### Correctness & edge cases
- **First run / no memory yet:** behaves like a full sync (today's behavior) and
  then records what was synced.
- **Memory is per scope and per server:** global (`~/.claude`) vs project
  (`./.claude`), and different servers, must not be confused with each other.
- **Deletion candidates:** the user must still be able to learn about remote
  configs that no longer have a local match. It is acceptable that this only
  happens on runs that actually contact the server (i.e. when there are changes,
  or under the force/full flag) and not on an instant "up to date" run.
- The force/full flag must always be able to recover from any inconsistency
  between local memory and real server state.

### Out of scope (explicitly)
- No client↔server hash-negotiation handshake. The upload stays a normal request
  carrying full content for the changed items; we are not building a multi-step
  fingerprint exchange.

---

## Part 2 — Faster Downloads (`download`)

### Parallel bulk download
- The user can download **multiple extensions at once**, fetched in parallel
  rather than sequentially.
- Selection methods:
  - **Multiple ids/names in a single command**, and
  - **Multi-select in the interactive list** (pick several, then all download in
    parallel).
- Downloads run with a sensible concurrency limit so the server isn't hammered.
- **Per-item results:** each requested extension reports its own success or
  failure; one failure must not abort the others. The final summary makes clear
  what installed and what didn't.
- Target-directory resolution (project vs global vs explicit path) applies to all
  items in the batch, consistent with today's single-download behavior.

---

## Success Criteria

- Re-running `sync` with no local changes returns "up to date" effectively
  instantly, doing no server work.
- Re-running `sync` after editing one config sends only that config (and its
  files, if a skill), not the whole set.
- A force/full sync always reconciles correctly against the server, even when
  local memory is stale or wrong.
- Downloading N extensions in one command completes in roughly the time of the
  slowest single download, not the sum of all of them, with a clear per-item
  result summary.

## Non-Goals

- Changing the conversion/format pipeline.
- Two-way sync (pulling remote-only configs down to local). Sync remains
  push-only; downloads remain extension-oriented.
- Authentication / access-model changes.
