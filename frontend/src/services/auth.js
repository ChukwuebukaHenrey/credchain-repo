// ─────────────────────────────────────────────────────────────
// CredChain Frontend — auth/session helpers
// Tiny localStorage wrapper for the JWT + the logged-in user object.
// The axios interceptor in ./api.js reads the same 'credchain_token' key.
// ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'credchain_token';
const USER_KEY = 'credchain_user';

// Persist the token + user after a successful login/register.
export function saveSession(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Returns the stored user object, or null if absent / unparseable.
export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error('[auth] failed to parse stored user', error);
    return null;
  }
}

// Clear the whole session (logout / expired token).
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn() {
  return Boolean(getToken());
}
