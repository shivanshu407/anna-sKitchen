# Security — Admin Authentication

## What this subsystem does
Gates the admin area. Anyone may read the catalogue and blogs; only an authenticated
admin may create or delete them. Added 2026-09-07, replacing a login that compared
credentials in browser JavaScript and guarded nothing.

## How it is structured
| File | Role |
|------|------|
| `server/auth.js` | scrypt hashing, session sign/verify, `requireAuth`, login rate limiter |
| `server/routes/auth.js` | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| `src/api/auth.js` | Front-end calls for the three endpoints |
| `src/components/RequireAuth.jsx` | Route guard; asks the server who you are |
| `scripts/hash-password.mjs` | Generates the three environment variables |

### The session
A stateless token in an httpOnly cookie:
```
base64url(JSON payload) "." base64url(HMAC-SHA256(payload, SESSION_SECRET))
```
The algorithm is fixed and never read from the token, so the JWT "algorithm confusion"
attack does not apply. Stateless means a Hostinger restart does not sign the admin out and
there is no session table to maintain. Lifetime is 8 hours.

Cookie flags: `httpOnly` (JavaScript cannot read it, so an XSS bug cannot steal the
session), `SameSite=Strict` (not sent cross-site, which is what blocks CSRF — no separate
CSRF token is needed), and `Secure` in production only, so local HTTP development works.

### The password
Never stored anywhere in plaintext. `ADMIN_PASSWORD_HASH` holds a scrypt hash
(`N=16384, r=8, p=1`, 64-byte key, random 16-byte salt) in the form
`scrypt$<salt b64>$<key b64>`. Comparison is constant-time via `timingSafeEqual`.

## Conventions and rules
- **Every mutating route carries `requireAuth`.** `POST`/`DELETE` on products and blogs,
  plus (2026-10-27) `PUT /api/blogs/:slug` and `POST /api/blogs/images`. `GET` stays
  public — the site needs it — except `GET /api/blogs?drafts=1`, which lists drafts and
  requires a session.
- **Blog content is allowlisted on the server** (`server/blog-input.js`): only known
  TipTap nodes/marks survive, link hrefs are limited to http(s)/mailto/tel/site paths/
  anchors (no `javascript:`, `//host` or `/\host`), images to Cloudinary or site paths,
  with size and depth caps. Pages render the JSON through React, never as HTML.
- **Blog uploads are limited**: JPEG/PNG/WebP/AVIF, 5 MB, one file per request.
- **`requireAuth` runs before multer**, so an unauthenticated upload is rejected before the
  file is buffered into memory. Keep that order when adding upload routes.
- **It fails closed.** If `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` or `SESSION_SECRET` is
  missing — or the secret is under 32 characters — every login and every write is refused
  with 503. An unconfigured deployment must never be an open one.
- **Config is read per request, not at module load**, so a missing variable is a clear
  error rather than a boot crash.
- **The route guard is usability, not security.** `RequireAuth` only decides what to
  render. The real boundary is `requireAuth` on the server, which holds even if someone
  edits the bundle.
- Login failures return one message for both a wrong username and a wrong password, and the
  password check runs either way, so neither the text nor the timing reveals which was wrong.

## Setting it up
```bash
npm run admin:password
```
Prints `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` and `SESSION_SECRET`. Paste them into
hPanel → your app → Environment variables and restart. Minimum password length is 12.

## Known gotchas
- **Rotating `SESSION_SECRET` signs out every active session immediately.** That is the
  intended way to revoke access.
- **The rate limiter is in-memory**: 10 attempts per IP per 15 minutes. It resets on
  restart and is not shared across instances. It blunts online guessing; it is not a
  defence against a distributed attack.
- **`clearCookie` must repeat the original attributes** (`httpOnly`, `sameSite`, `secure`,
  `path`). Omit them and the browser treats it as a different cookie and keeps the session.
- **CORS is now development-only.** The SPA and API share an origin in production, so
  reflecting arbitrary origins would only help someone else's page call this API.
- A session expiring mid-edit surfaces as "Authentication required" on save. The work in
  the form is not submitted; sign in again.

## Still open
- **Single shared admin account.** No per-user accounts, roles, or audit trail. Adequate
  for one operator; revisit if more people need access.
- **No password reset flow.** Recovery is regenerating the hash and updating the env var.
- **No account lockout**, only per-IP rate limiting.

## How it is tested
`server/auth.test.js` (unit) covers hashing (correct, wrong, salted, malformed input,
plaintext never present), session tokens (round-trip, wrong secret, **tampered payload with
a replayed signature**, expiry, stripped signature, malformed input), cookie flags, the
fail-closed matrix for each missing variable, and the rate limiter.

`server/auth-routes.test.js` (integration) boots the real app and asserts all four mutating
routes return 401 anonymously and 401 with a forged cookie, that reads stay public, that
login rejects bad credentials with an identical message, that a real login sets a hardened
cookie and opens the writes, and that an unconfigured server returns 503 rather than
allowing the write.

Not covered: browser-level behaviour, which was verified manually — direct navigation to
`/admin/dashboard` redirects to login, the old `admin123` is rejected, a correct login
reaches the dashboard with the cookie invisible to `document.cookie`, and sign-out returns
to login and stays there.

## Related
- [known-issues.md](known-issues.md) — ISSUE-001, now resolved
- [deployment.md](deployment.md) — where the environment variables go
