import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'node:module';

// End-to-end checks against the real Express app: the mutating routes must be
// closed to anonymous callers, and a real login must open them.

const require = createRequire(import.meta.url);
const { hashPassword } = require('./auth.js');

const USERNAME = 'testadmin';
const PASSWORD = 'a-sufficiently-long-password';
const SECRET = 'x'.repeat(48);

let server;
let base;

beforeAll(async () => {
    // Empty, never deleted: a deleted variable is refilled by dotenv from a
    // local .env, which pointed these tests at the production database.
    process.env.MONGODB_URI = '';
    process.env.ADMIN_USERNAME = USERNAME;
    process.env.ADMIN_PASSWORD_HASH = hashPassword(PASSWORD);
    process.env.SESSION_SECRET = SECRET;

    const { default: app } = await import('./index.js');
    await new Promise((resolve) => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
});

const MUTATIONS = [
    ['POST', '/api/products'],
    ['DELETE', '/api/products/heating-range/0'],
    ['POST', '/api/blogs'],
    ['DELETE', '/api/blogs/some-slug'],
];

describe('mutating routes reject anonymous callers', () => {
    it.each(MUTATIONS)('%s %s returns 401 without a session', async (method, path) => {
        const res = await fetch(base + path, { method });

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toMatchObject({ error: 'Authentication required' });
    });

    it.each(MUTATIONS)('%s %s rejects a forged cookie', async (method, path) => {
        const forged = Buffer.from(
            JSON.stringify({ sub: USERNAME, exp: Math.floor(Date.now() / 1000) + 9999 })
        ).toString('base64url');

        const res = await fetch(base + path, {
            method,
            headers: { Cookie: `ak_admin=${forged}.not-a-real-signature` },
        });

        expect(res.status).toBe(401);
    });
});

describe('read routes stay public', () => {
    // DB_WAIT: these reach Mongoose, which buffers for bufferTimeoutMS (5s)
    // before rejecting. That is exactly Vitest's default deadline, so they get
    // explicit headroom rather than racing it.
    const DB_WAIT = 15_000;

    it('GET /api/products does not require a session', async () => {
        // No database here, so this fails at the DB layer — the point is only
        // that it is not turned away at the auth layer.
        const res = await fetch(`${base}/api/products`);
        expect(res.status).not.toBe(401);
    }, DB_WAIT);

    it('GET /api/blogs does not require a session', async () => {
        const res = await fetch(`${base}/api/blogs`);
        expect(res.status).not.toBe(401);
    }, DB_WAIT);
});

describe('login', () => {
    const postLogin = (body) => fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    it('rejects a wrong password', async () => {
        const res = await postLogin({ username: USERNAME, password: 'wrong-password-here' });
        expect(res.status).toBe(401);
    });

    it('rejects an unknown username', async () => {
        const res = await postLogin({ username: 'nobody', password: PASSWORD });
        expect(res.status).toBe(401);
    });

    it('gives the same message for both, revealing nothing about which was wrong', async () => {
        const [badUser, badPass] = await Promise.all([
            postLogin({ username: 'nobody', password: PASSWORD }).then((r) => r.json()),
            postLogin({ username: USERNAME, password: 'wrong-password-here' }).then((r) => r.json()),
        ]);

        expect(badUser.error).toBe(badPass.error);
    });

    it('rejects a non-string password without crashing', async () => {
        const res = await postLogin({ username: USERNAME, password: { $ne: null } });
        expect(res.status).toBe(400);
    });

    it('sets a hardened session cookie on success', async () => {
        const res = await postLogin({ username: USERNAME, password: PASSWORD });
        expect(res.status).toBe(200);

        const cookie = res.headers.get('set-cookie');
        expect(cookie).toMatch(/ak_admin=/);
        expect(cookie).toMatch(/HttpOnly/i);
        expect(cookie).toMatch(/SameSite=Strict/i);
    });

    it('opens the mutating routes once authenticated', async () => {
        const login = await postLogin({ username: USERNAME, password: PASSWORD });
        const cookie = login.headers.get('set-cookie').split(';')[0];

        const res = await fetch(`${base}/api/products/heating-range/0`, {
            method: 'DELETE',
            headers: { Cookie: cookie },
        });

        // Past the auth gate. It still fails at the database, which is absent here.
        expect(res.status).not.toBe(401);
    }, 15_000);

    it('reports the signed-in admin via /api/auth/me', async () => {
        const login = await postLogin({ username: USERNAME, password: PASSWORD });
        const cookie = login.headers.get('set-cookie').split(';')[0];

        const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } });
        expect(me.status).toBe(200);
        await expect(me.json()).resolves.toEqual({ username: USERNAME });
    });

    it('returns 401 from /api/auth/me without a session', async () => {
        const res = await fetch(`${base}/api/auth/me`);
        expect(res.status).toBe(401);
    });

    it('clears the cookie on logout', async () => {
        const res = await fetch(`${base}/api/auth/logout`, { method: 'POST' });
        expect(res.status).toBe(200);
        expect(res.headers.get('set-cookie')).toMatch(/ak_admin=;|ak_admin=deleted|Expires=Thu, 01 Jan 1970/i);
    });
});

describe('unconfigured server fails closed', () => {
    it('refuses writes with 503 when SESSION_SECRET is absent', async () => {
        const saved = process.env.SESSION_SECRET;
        delete process.env.SESSION_SECRET;
        try {
            const res = await fetch(`${base}/api/blogs/some-slug`, { method: 'DELETE' });
            // Critically: not 200. An unconfigured deployment must not be an open one.
            expect(res.status).toBe(503);
        } finally {
            process.env.SESSION_SECRET = saved;
        }
    });
});
