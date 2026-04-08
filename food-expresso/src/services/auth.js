import API from './api';

const AUTH_TOKEN_KEY = 'food-auth-token';
const USER_KEY = 'user';
const SESSION_META_KEY = 'auth-session-meta';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000;

const authStorage = window.sessionStorage;

const now = () => Date.now();

const parseSessionMeta = () => {
  try {
    const raw = authStorage.getItem(SESSION_META_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return null;

    const loginAt = Number(parsed.loginAt);
    const lastActivityAt = Number(parsed.lastActivityAt);
    if (!Number.isFinite(loginAt) || !Number.isFinite(lastActivityAt)) return null;

    return { loginAt, lastActivityAt };
  } catch {
    return null;
  }
};

const saveSessionMeta = (meta) => {
  authStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
};

const isSessionExpired = (meta) => {
  if (!meta) return true;
  const current = now();
  const idleExpired = current - meta.lastActivityAt > IDLE_TIMEOUT_MS;
  const absoluteExpired = current - meta.loginAt > ABSOLUTE_TIMEOUT_MS;
  return idleExpired || absoluteExpired;
};

export const login = (credentials) => API.post('/auth/login', credentials);

export const setSession = (token, user) => {
  if (token) {
    authStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  if (user && typeof user === 'object') {
    authStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  const current = now();
  saveSessionMeta({ loginAt: current, lastActivityAt: current });
};

export const updateSessionUser = (user) => {
  if (user && typeof user === 'object') {
    authStorage.setItem(USER_KEY, JSON.stringify(user));
  }
};

export const touchSession = () => {
  const meta = parseSessionMeta();
  if (!meta || isSessionExpired(meta)) {
    clearSession();
    return false;
  }
  saveSessionMeta({ ...meta, lastActivityAt: now() });
  return true;
};

export const clearSession = () => {
  authStorage.removeItem(AUTH_TOKEN_KEY);
  authStorage.removeItem(USER_KEY);
  authStorage.removeItem(SESSION_META_KEY);
};

export const getToken = () => {
  const token = authStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return null;
  if (!touchSession()) return null;
  return token;
};

export const getStoredUser = () => {
  if (!touchSession()) return null;
  try {
    const raw = authStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const isAuthenticated = () => Boolean(getToken() && getStoredUser());

export const getSessionPolicy = () => ({
  idleTimeoutMs: IDLE_TIMEOUT_MS,
  absoluteTimeoutMs: ABSOLUTE_TIMEOUT_MS,
});
