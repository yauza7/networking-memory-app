import { X } from "lucide-react";
import { useState } from "react";

export function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-lg mx-auto">
      <div
        style={{
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(40px) saturate(180%)",
          WebkitBackdropFilter: "blur(40px) saturate(180%)",
          border: "0.5px solid rgba(0,122,255,0.18)",
          borderRadius: "18px",
          boxShadow: "0 8px 32px rgba(0,80,180,0.12), inset 0 1px 0 rgba(255,255,255,1)",
          padding: "12px 14px",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #5AC8FA, #007AFF)" }}
          >
            <span style={{ color: "white", fontSize: "13px", fontWeight: 700 }}>W</span>
          </div>
          <p style={{ fontSize: "13px", color: "#3c3c43", flex: 1, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, color: "#0a1628" }}>W·52 Demo · </span>
            Прототип для обмена визитками — попробуйте QR, контакты и онбординг
          </p>
          <button
            onClick={() => setIsVisible(false)}
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(0,0,0,0.06)" }}
          >
            <X className="w-3.5 h-3.5" style={{ color: "#8E8E93" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
