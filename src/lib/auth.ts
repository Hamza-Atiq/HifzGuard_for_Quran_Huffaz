import 'server-only';
import { cookies } from 'next/headers';

// User API OAuth runs against the PRE-LIVE environment, because production has
// user features disabled by default. Content API uses a separate (production)
// credential set — see quran-client.ts.
const USER_OAUTH_BASE =
  (process.env.QURAN_USER_AUTH_BASE_URL ||
    process.env.QURAN_AUTH_BASE_URL ||
    'https://prelive-oauth2.quran.foundation') + '/oauth2';

function userClientId(): string | undefined {
  return process.env.QURAN_USER_CLIENT_ID || process.env.QURAN_CLIENT_ID;
}
function userClientSecret(): string | undefined {
  return process.env.QURAN_USER_CLIENT_SECRET || process.env.QURAN_CLIENT_SECRET;
}

// Scopes are read from env so we can flip them on as QF enables them on the
// client, without a code redeploy. Default is the minimum that's known to be
// allowed on a fresh QF prelive client (openid + profile). Set
// QURAN_OAUTH_SCOPES to a space-separated list to request more, e.g.:
//   openid profile bookmark.crud collection.crud goal.crud streak.read
//   activityday.crud note.crud reading_session.crud post.read post.crud
const SCOPES =
  process.env.QURAN_OAUTH_SCOPES?.trim() || 'openid profile';

const TOKEN_COOKIE = 'qf_access_token';
const REFRESH_COOKIE = 'qf_refresh_token';
const VERIFIER_COOKIE = 'qf_pkce_verifier';
const STATE_COOKIE = 'qf_oauth_state';

function base64url(buf: ArrayBuffer): string {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sha256(input: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(input);
  return crypto.subtle.digest('SHA-256', data);
}

export async function buildLoginUrl(): Promise<string> {
  const clientId = userClientId();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (!clientId) throw new Error('QURAN_USER_CLIENT_ID not set');

  const verifier = base64url(crypto.getRandomValues(new Uint8Array(64)).buffer);
  const challenge = base64url(await sha256(verifier));
  const state = base64url(crypto.getRandomValues(new Uint8Array(16)).buffer);

  const c = await cookies();
  c.set(VERIFIER_COOKIE, verifier, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });
  c.set(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' });

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: `${appUrl}/api/auth/callback`,
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });
  return `${USER_OAUTH_BASE}/auth?${params.toString()}`;
}

export async function exchangeCode(code: string, state: string): Promise<void> {
  const clientId = userClientId();
  const clientSecret = userClientSecret();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (!clientId || !clientSecret) throw new Error('Missing user-API OAuth credentials');

  const c = await cookies();
  const verifier = c.get(VERIFIER_COOKIE)?.value;
  const expected = c.get(STATE_COOKIE)?.value;
  if (!verifier || !expected || expected !== state) {
    throw new Error('Invalid OAuth state — possible CSRF');
  }

  // Send credentials BOTH ways: HTTP Basic Auth (preferred by OAuth 2.1 for
  // confidential clients) AND in the body (broader compatibility). QF accepts
  // either; using both means a wrong-secret 401 surfaces cleanly via the
  // Basic header while still working for servers that only check the body.
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${appUrl}/api/auth/callback`,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: verifier,
  });

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${USER_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
      Accept: 'application/json',
    },
    body,
  });
  if (!res.ok) {
    const respText = await res.text().catch(() => '');
    // Surface QF's actual error code (e.g. invalid_client, invalid_grant)
    // back to the user via the AuthBanner so we can debug from the URL.
    throw new Error(`Token exchange failed: ${res.status} — ${respText.slice(0, 300)}`);
  }
  const json = await res.json();
  c.set(TOKEN_COOKIE, json.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: json.expires_in ?? 3600,
  });
  if (json.refresh_token) {
    c.set(REFRESH_COOKIE, json.refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  c.delete(VERIFIER_COOKIE);
  c.delete(STATE_COOKIE);
}

export async function getAccessToken(): Promise<string | null> {
  const c = await cookies();
  return c.get(TOKEN_COOKIE)?.value ?? null;
}

export async function clearSession(): Promise<void> {
  const c = await cookies();
  c.delete(TOKEN_COOKIE);
  c.delete(REFRESH_COOKIE);
}
