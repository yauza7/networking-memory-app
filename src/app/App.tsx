import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Navigation } from "./components/Navigation";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ensureRegistered } from "./utils/serverSync";

import { SplashScreen } from "./screens/SplashScreen";
import { Setup } from "./screens/Setup";
import { Dashboard } from "./screens/Dashboard";
import { MyCard } from "./screens/MyCard";
import { Contacts } from "./screens/Contacts";
import { ContactDetail } from "./screens/ContactDetail";
import { Scanner } from "./screens/Scanner";
import { Onboarding } from "./screens/Onboarding";
import { AddNote } from "./screens/AddNote";
import { AddContact } from "./screens/AddContact";
import { ShareProfile } from "./screens/ShareProfile";
import { EditProfile } from "./screens/EditProfile";
import { Notifications } from "./screens/Notifications";
import { Settings } from "./screens/Settings";
import { Tasks } from "./screens/Tasks";
import { PublicProfile } from "./screens/PublicProfile";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const pageTransition = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const };

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="w-full min-h-full overflow-y-auto"
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/my-card" element={<MyCard />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contact/:id" element={<ContactDetail />} />
          <Route path="/scan" element={<Scanner />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/add-note" element={<AddNote />} />
          <Route path="/add-contact" element={<AddContact />} />
          <Route path="/share-profile" element={<ShareProfile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/u/:username" element={<PublicProfile />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

/** Show navigation only on main app screens (not setup/public profile) */
function AppShell({ needsSetup }: { needsSetup: boolean }) {
  const location = useLocation();
  const isPublic = location.pathname.startsWith("/u/");
  const isSetup = location.pathname === "/setup";
  return (
    <>
      <AnimatedRoutes />
      {!needsSetup && !isPublic && !isSetup && <Navigation />}
    </>
  );
}

export default function App() {
  // Telegram WebApp init
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.disableVerticalSwipes?.();
        const bg = tg.themeParams?.bg_color || "#EEF6FF";
        tg.setHeaderColor?.(bg);
        tg.setBackgroundColor?.(bg);
        tg.enableClosingConfirmation?.();
      } catch (e) {
        console.error("Telegram WebApp init failed:", e);
      }
    }
    // Register chat_id so the cron job can DM reminders
    ensureRegistered().catch(() => {});
  }, []);

  // Splash screen — shown once per session
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem("splashShown")
  );

  // First-launch registration check
  const [needsSetup, setNeedsSetup] = useState(
    () => !localStorage.getItem("w52_profile")
  );

  const handleSplashFinish = () => {
    sessionStorage.setItem("splashShown", "1");
    setShowSplash(false);
  };

  // Listen for profile being saved (Setup screen calls saveCurrentUser)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "w52_profile" && e.newValue) setNeedsSetup(false);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <ErrorBoundary>
      <AnimatePresence>
        {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      </AnimatePresence>

      {!showSplash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full min-h-full overflow-x-hidden"
        >
          {needsSetup ? (
            /* Show setup outside BrowserRouter so navigate("/", replace) works cleanly */
            <BrowserRouter>
              <Routes>
                <Route
                  path="*"
                  element={
                    <Setup
                      onComplete={() => setNeedsSetup(false)}
                    />
                  }
                />
              </Routes>
            </BrowserRouter>
          ) : (
            <BrowserRouter>
              <AppShell needsSetup={false} />
            </BrowserRouter>
          )}
        </motion.div>
      )}
    </ErrorBoundary>
  );
}
