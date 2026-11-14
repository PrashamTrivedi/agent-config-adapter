# Interesting details

Small things that are true of this codebase and easy to get wrong. Read from the
source, not from the docs.

## The sync fingerprint ignores edge whitespace, but not internal whitespace

`cli/src/lib/hash.ts` → `hashConfig()`

Before hashing, the CLI normalises a config's body:

```ts
function normalize(content: string): string {
  return content.trim().replace(/\r\n/g, '\n');
}
```

The digest is SHA-256 over a NUL-delimited canonical form: `type\0name\0content`.
The point of the hash is to let `sync` skip configs that have not changed since
the last sync.

What that means in practice:

- A pure CRLF → LF conversion, or a trailing newline added by an editor's
  "insert final newline", does **not** change the digest. `sync` sees no change
  and pushes nothing.
- A space added or removed *inside* the body — including at the end of an
  interior line — **does** change it, because `trim()` only touches the two ends
  of the string.
- Leading and trailing blank lines are erased before comparison, so they are
  invisible to change detection.

Consequence worth remembering: if a teammate's fix is "just line endings", the
CLI will report the config as unchanged and their fix will never sync. The edit
has to land inside the body to be visible.

### Skills fold in every companion file

For `skills`, `hashConfig()` also hashes each companion file: path plus raw
content, sorted by path so the digest is stable. Binary files are hashed in
their base64 form, so a one-byte change to an image asset flips the fingerprint
as loudly as an edit to `SKILL.md`.

### Renames look like a delete plus an add

`hashConfigs()` keys its map as `` `${type}:${name}` `` via `configKey()`.
Because the name is part of the key, renaming a config always appears to sync
as one deletion and one addition — the diff cannot follow a rename.
