/**
 * App-wide user settings — persisted to localStorage.
 */

const STORAGE_KEY = "appSettings";

export const DEFAULT_SETTINGS = {
  companyName: "BCFM",
  tribes: [
    { id: "ninjalar", name: "Ninjalar",  teams: ["Team B", "Apex"],                    color: "#ef4444" },
    { id: "spaces",   name: "Spaces",    teams: ["Mando", "Solid", "Bank Dhofar"],     color: "#3b82f6" },
    { id: "olimpos",  name: "Olimpos",   teams: ["Atlas", "Guardians", "Titan"],       color: "#f59e0b" },
  ],
  teams: ["Team B", "Apex", "Mando", "Solid", "Bank Dhofar", "Atlas", "Guardians", "Titan"],
  scopes: ["DaaS (Fix)", "7/24 Support", "Outsource", "Man/Day (Fix)", "DaaS (T&M)", "Man/Day (T&M)", "Other"],
  renewalWindowDays: 90,
  churnAlertDays: 30,
  tierThresholds: { aPlus: 20, a: 10, b: 5 },
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}
