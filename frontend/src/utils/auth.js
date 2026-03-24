/**
 * Client-side authentication & user management.
 * Users are stored in localStorage so changes persist.
 */

const SESSION_KEY = "auth_session";
const USERS_KEY   = "auth_users";

// ── Seed users (loaded on first run) ──────────────────────────────────────────
const SEED_USERS = [
  {
    id: 1,
    email: "admin@bcfm.com",
    password: "admin123",
    name: "Admin Kullanıcı",
    role: "Admin",
    initials: "AK",
    enabled: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    email: "gurkan@bcfm.com",
    password: "gurkan123",
    name: "Gürkan Solak",
    role: "Manager",
    initials: "GS",
    enabled: true,
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

// ── User store helpers ────────────────────────────────────────────────────────
export function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // First run: seed
  saveUsers(SEED_USERS);
  return [...SEED_USERS];
}

export function saveUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {}
}

function nextId(users) {
  return users.reduce((max, u) => Math.max(max, u.id || 0), 0) + 1;
}

function makeInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ── Public user-management API ────────────────────────────────────────────────

/** Add a new user. Returns the new user or null if email already exists. */
export function addUser({ name, email, password, role }) {
  const users = loadUsers();
  if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return null; // duplicate email
  }
  const user = {
    id: nextId(users),
    email: email.trim(),
    password,
    name: name.trim(),
    role,
    initials: makeInitials(name),
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, user]);
  return user;
}

/** Toggle enabled state. Returns updated user. */
export function toggleUserEnabled(id) {
  const users = loadUsers();
  const updated = users.map((u) =>
    u.id === id ? { ...u, enabled: !u.enabled } : u
  );
  saveUsers(updated);
  return updated.find((u) => u.id === id);
}

/** Change a user's role. */
export function setUserRole(id, role) {
  const users = loadUsers();
  const updated = users.map((u) => (u.id === id ? { ...u, role } : u));
  saveUsers(updated);
}

/** Delete a user by id. Cannot delete the last Admin. Returns true on success. */
export function deleteUser(id) {
  const users = loadUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return false;
  // Prevent deleting last admin
  if (
    target.role === "Admin" &&
    users.filter((u) => u.role === "Admin" && u.enabled).length <= 1
  ) {
    return false;
  }
  saveUsers(users.filter((u) => u.id !== id));
  return true;
}

// ── Session ───────────────────────────────────────────────────────────────────

/** Attempt login. Returns safe user object on success, null on failure. */
export function loginUser(email, password) {
  const users = loadUsers();
  const match = users.find(
    (u) =>
      u.email.toLowerCase() === email.trim().toLowerCase() &&
      u.password === password &&
      u.enabled !== false
  );
  if (!match) return null;

  const { password: _pw, ...safeUser } = match;
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ user: safeUser, loginAt: new Date().toISOString() })
    );
  } catch {}
  return safeUser;
}

/** Clear the current session. */
export function logoutUser() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

/** Return the logged-in user object, or null if not authenticated. */
export function getAuthUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { user } = JSON.parse(raw);
    return user || null;
  } catch {
    return null;
  }
}
