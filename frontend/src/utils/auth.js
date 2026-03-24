/**
 * Client-side authentication utility.
 * Uses localStorage to persist the session.
 * Demo users are hardcoded — no backend required.
 */

const STORAGE_KEY = "auth_session";

const DEMO_USERS = [
  {
    id: 1,
    email: "admin@bcfm.com",
    password: "admin123",
    name: "Admin Kullanıcı",
    role: "Admin",
    initials: "AK",
  },
  {
    id: 2,
    email: "gurkan@bcfm.com",
    password: "gurkan123",
    name: "Gürkan Solak",
    role: "Manager",
    initials: "GS",
  },
];

/**
 * Attempt login. Returns the user object on success, null on failure.
 */
export function loginUser(email, password) {
  const match = DEMO_USERS.find(
    (u) =>
      u.email.toLowerCase() === email.trim().toLowerCase() &&
      u.password === password
  );
  if (!match) return null;

  // Strip password before storing
  const { password: _pw, ...safeUser } = match;
  const session = { user: safeUser, loginAt: new Date().toISOString() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {}
  return safeUser;
}

/**
 * Clear the current session.
 */
export function logoutUser() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Return the logged-in user object, or null if not authenticated.
 */
export function getAuthUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { user } = JSON.parse(raw);
    return user || null;
  } catch {
    return null;
  }
}
