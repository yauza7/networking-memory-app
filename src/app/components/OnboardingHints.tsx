import { useState, useEffect } from "react";
import { X, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";

interface Hint {
  id: string;
  title: string;
  description: string;
  route?: string;
}

const hints: Hint[] = [
  {
    id: "scan-qr",
    title: "Сканируйте QR-коды",
    description: "На конференциях показывайте свой QR или сканируйте чужие для мгновенного обмена",
    route: "/scan",
  },
  {
    id: "tasks",
    title: "Ставьте задачи",
    description: "Добавляйте задачи к контактам, чтобы не забыть написать или позвонить",
    route: "/tasks",
  },
  {
    id: "follow-up",
    title: "Умные follow-up",
    description: "ИИ генерирует персонализированные сообщения для каждого контакта",
  },
];

export function OnboardingHints() {
  const [currentHint, setCurrentHint] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("hints-dismissed")) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("hints-dismissed", "true");
    setDismissed(true);
  };

  const handleNext = () => {
    if (currentHint < hints.length - 1) setCurrentHint(currentHint + 1);
    else handleDismiss();
  };

  if (dismissed) return null;

  const hint = hints[currentHint];

  return (
    <AnimatePresence>
      <motion.div
        className="px-4 pb-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className="glass-card p-4"
          style={{ borderColor: "rgba(0,122,255,0.15)" }}
        >
          <div className="flex items-start gap-3">
            <div
              className="p-2 rounded-xl flex-shrink-0"
              style={{ background: "rgba(0,122,255,0.1)" }}
            >
              <Sparkles className="w-4 h-4" style={{ color: "#007AFF" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontWeight: 600, fontSize: "14px", color: "#0a1628", marginBottom: "2px" }}>
                {hint.title}
              </p>
              <p style={{ fontSize: "13px", color: "#8E8E93", lineHeight: 1.4, marginBottom: "10px" }}>
                {hint.description}
              </p>
              <div className="flex items-center gap-2">
                {hint.route ? (
                  <Link
                    to={hint.route}
                    onClick={handleNext}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-white text-xs font-semibold"
                    style={{
                      background: "linear-gradient(180deg, #3AA3FF 0%, #007AFF 100%)",
                      boxShadow: "0 2px 8px rgba(0,122,255,0.35)",
                    }}
                  >
                    {currentHint < hints.length - 1 ? "Далее" : "Понятно"}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-white text-xs font-semibold"
                    style={{
                      background: "linear-gradient(180deg, #3AA3FF 0%, #007AFF 100%)",
                      boxShadow: "0 2px 8px rgba(0,122,255,0.35)",
                    }}
                  >
                    {currentHint < hints.length - 1 ? "Далее" : "Понятно"}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs font-medium"
                  style={{ color: "#8E8E93" }}
                >
                  Пропустить
                </button>
                <span className="ml-auto text-xs" style={{ color: "#C7C7CC" }}>
                  {currentHint + 1}/{hints.length}
                </span>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-full flex-shrink-0"
              style={{ background: "rgba(0,0,0,0.05)" }}
            >
              <X className="w-3.5 h-3.5" style={{ color: "#8E8E93" }} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
