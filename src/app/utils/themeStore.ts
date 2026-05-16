/**
 * Theme storage — dark (default) / light.
 * Applied via html[data-theme="light"] attribute.
 */
const KEY = "w52_theme";

export type Theme = "dark" | "light";

export function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function saveTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t);
  } catch {}
  applyTheme(t);
}

export function applyTheme(t: Theme) {
  const html = document.documentElement;
  if (t === "light") html.setAttribute("data-theme", "light");
  else html.removeAttribute("data-theme");
}

export function toggleTheme(): Theme {
  const next: Theme = loadTheme() === "light" ? "dark" : "light";
  saveTheme(next);
  return next;
}
