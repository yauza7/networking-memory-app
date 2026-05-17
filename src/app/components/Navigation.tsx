/**
 * W·52 — bottom TabBar (moody navy + cyan).
 * 5 tabs: Главная · Задачи · [Scan] · Контакты · Профиль
 * Scan sits dead-center as cyan glow circle without a text label.
 */
import { useLocation, Link } from "react-router";

const NAV_ITEMS = [
  { to: "/", id: "home", label: "Главная" },
  { to: "/tasks", id: "tasks", label: "Задачи" },
  { to: "/scan", id: "scan", label: "", emph: true },
  { to: "/contacts", id: "contacts", label: "Контакты" },
  { to: "/my-card", id: "me", label: "Профиль" },
];

const HIDDEN_PATHS = [
  "/onboarding",
  "/add-note",
  "/share-profile",
  "/contact/",
  "/edit-profile",
  "/notifications",
  "/settings",
  "/u/",
  "/add-contact",
  "/voice-note",
];

function TabIcon({ id, active }: { id: string; active: boolean }) {
  const c = active ? "var(--ivory)" : "var(--faint)";
  if (id === "home")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="2" fill={c} />
        <circle cx="10" cy="10" r="5.5" stroke={c} strokeWidth="1.2" opacity="0.65" fill="none" />
        <circle cx="10" cy="10" r="9" stroke={c} strokeWidth="1" opacity="0.35" fill="none" />
      </svg>
    );
  if (id === "tasks")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 10 L 8 14 L 17 5" stroke={c} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  if (id === "contacts")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="13" cy="7" r="2.2" stroke={c} strokeWidth="1.3" fill="none" opacity="0.55" />
        <path d="M8 17 Q 13 13, 18 17" stroke={c} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.55" />
        <circle cx="8" cy="7.5" r="2.8" stroke={c} strokeWidth="1.5" fill="none" />
        <path d="M2 17 Q 8 12, 14 17" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    );
  if (id === "me")
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="3" stroke={c} strokeWidth="1.5" fill="none" />
        <path d="M3 17 Q 10 11, 17 17" stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    );
  return null;
}

function ScanIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
      <path d="M2 5V2h3M13 2h3v3M16 13v3h-3M5 16H2v-3" stroke="var(--abyss)" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="5" y="6" width="2.5" height="2.5" stroke="var(--abyss)" strokeWidth="1.4" fill="none" />
      <rect x="10.5" y="6" width="2.5" height="2.5" stroke="var(--abyss)" strokeWidth="1.4" fill="none" />
      <rect x="5" y="9.5" width="2.5" height="2.5" stroke="var(--abyss)" strokeWidth="1.4" fill="none" />
      <rect x="10.5" y="9.5" width="1.1" height="1.1" fill="var(--abyss)" />
      <rect x="12" y="11.5" width="1" height="1" fill="var(--abyss)" />
    </svg>
  );
}

export function Navigation() {
  const location = useLocation();
  if (HIDDEN_PATHS.some((p) => location.pathname.startsWith(p))) return null;

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 14,
        left: 14,
        right: 14,
        zIndex: 40,
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          background: "var(--nav-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--line-soft)",
          borderRadius: 22,
          padding: "12px 8px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "var(--nav-shadow)",
        }}
      >
        {NAV_ITEMS.map((t) => {
          const active = isActive(t.to);
          return (
            <Link
              key={t.id}
              to={t.to}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: t.emph ? 0 : 4,
                color: active ? "var(--ivory)" : "var(--faint)",
                textDecoration: "none",
                minHeight: 38,
                justifyContent: "center",
              }}
            >
              {t.emph ? (
                <div
                  className="signal-glow"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "var(--signal)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: -24,
                  }}
                >
                  <ScanIcon />
                </div>
              ) : (
                <>
                  <TabIcon id={t.id} active={active} />
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 9.5,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {t.label}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
