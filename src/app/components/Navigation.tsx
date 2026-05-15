import { Home, Users, QrCode, User } from "lucide-react";
import { useLocation, Link } from "react-router";
import { motion } from "motion/react";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Главная" },
  { to: "/scan", icon: QrCode, label: "Скан" },
  { to: "/contacts", icon: Users, label: "Контакты" },
  { to: "/my-card", icon: User, label: "Профиль" },
];

const HIDDEN_PATHS = [
  "/onboarding", "/add-note", "/share-profile", "/contact/",
  "/edit-profile", "/notifications", "/settings", "/tasks", "/u/",
  "/add-contact", "/voice-note",
];

export function Navigation() {
  const location = useLocation();

  if (HIDDEN_PATHS.some((p) => location.pathname.startsWith(p))) return null;

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(249, 249, 251, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "0.5px solid rgba(0, 0, 0, 0.08)",
        }}
      />
      <div className="relative flex items-center justify-around h-[58px] max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center justify-center flex-1 h-full gap-[3px]"
            >
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon
                  className="w-[22px] h-[22px]"
                  style={{ color: active ? "#007AFF" : "#8E8E93" }}
                  strokeWidth={active ? 2.2 : 1.8}
                />
              </motion.div>
              <span
                className="text-[10px] font-medium transition-colors"
                style={{ color: active ? "#007AFF" : "#8E8E93" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
