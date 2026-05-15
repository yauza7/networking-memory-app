import { useState, useEffect, useRef, useCallback } from "react";
import { QrCode, Camera, X, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { addStoredContact } from "../utils/contactStore";
import type { Connection, User } from "../utils/mockData";

type ScanState = "idle" | "scanning" | "done" | "error";

export function Scanner() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const detectorRef = useRef<any>(null);

  const [state, setState] = useState<ScanState>("idle");
  const [scannedValue, setScannedValue] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [hasTgScanner] = useState(() => !!(window as any).Telegram?.WebApp?.showScanQrPopup);
  const [hasBarcodeDetector] = useState(() => "BarcodeDetector" in window);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Telegram native scanner ─────────────────────────────
  const startTelegramScan = () => {
    const tg = (window as any).Telegram?.WebApp;
    setState("scanning");
    tg.showScanQrPopup({ text: "Наведите на QR-код контакта" }, (text: string) => {
      tg.closeScanQrPopup();
      handleResult(text);
      return true;
    });
  };

  // ── Browser camera + BarcodeDetector ───────────────────
  const startCameraScan = async () => {
    setState("scanning");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (hasBarcodeDetector) {
        try {
          detectorRef.current = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        } catch {
          detectorRef.current = null;
        }
      }

      scanLoop();
    } catch (e: any) {
      stopCamera();
      setState("error");
      if (e?.name === "NotAllowedError") {
        setErrorMsg("Нет доступа к камере. Разрешите доступ в настройках браузера.");
      } else {
        setErrorMsg("Не удалось открыть камеру.");
      }
    }
  };

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    if (detectorRef.current) {
      detectorRef.current.detect(canvas).then((codes: any[]) => {
        if (codes.length > 0) {
          handleResult(codes[0].rawValue);
        } else {
          rafRef.current = requestAnimationFrame(scanLoop);
        }
      }).catch(() => {
        rafRef.current = requestAnimationFrame(scanLoop);
      });
    } else {
      // No BarcodeDetector – keep looping (camera stays open, just can't decode)
      rafRef.current = requestAnimationFrame(scanLoop);
    }
  }, []); // eslint-disable-line

  /** Try to decode the real name from a W52 QR `d` param */
  const decodeNameFromD = (d: string): string => {
    try {
      const json = decodeURIComponent(escape(atob(d)));
      return JSON.parse(json).n || "";
    } catch {
      return "";
    }
  };

  /** Extract display name + username from whatever was scanned */
  const parseScanned = (text: string): { display: string; username: string } => {
    try {
      const url = new URL(text);
      const segs = url.pathname.split("/").filter(Boolean);
      const d = url.searchParams.get("d") || "";
      const nameFromD = d ? decodeNameFromD(d) : "";

      // W52 profile QR: /u/<username>
      if (segs[0] === "u" && segs[1]) {
        return { display: nameFromD || segs[1], username: segs[1] };
      }
      // t.me/<username>
      if (url.hostname === "t.me" && segs[0]) {
        return { display: nameFromD || segs[0], username: segs[0] };
      }
      return { display: url.hostname, username: "" };
    } catch {
      return { display: text.length > 40 ? text.slice(0, 40) + "…" : text, username: "" };
    }
  };

  const handleResult = (text: string) => {
    stopCamera();
    setScannedValue(text);
    setState("done");
  };

  const handleSave = () => {
    let username = "";
    let decodedProfile: Partial<User> | null = null;

    try {
      const url = new URL(scannedValue);
      const segs = url.pathname.split("/").filter(Boolean);
      const d = url.searchParams.get("d");

      if (segs[0] === "u" && segs[1]) username = segs[1];
      else if (url.hostname === "t.me" && segs[0]) username = segs[0];

      if (d) {
        try {
          const json = decodeURIComponent(escape(atob(d)));
          const p = JSON.parse(json);
          decodedProfile = {
            name:    p.n  || "",
            role:    p.r  || "",
            company: p.c  || "",
            tags:    Array.isArray(p.t) ? p.t : [],
            photo:   p.p  || undefined,
            username: p.un || username || undefined,
            bio:     p.b  || undefined,
            links:   (p.un || username) ? [{ type: "telegram", url: `https://t.me/${p.un || username}` }] : [],
          };
        } catch {}
      }
    } catch {}

    const effectiveUsername = decodedProfile?.username || username || undefined;
    const name = decodedProfile?.name || effectiveUsername || "Новый контакт";

    const contactId = `c-${Date.now()}`;
    const contact: Connection = {
      id: contactId,
      user: {
        id: `u-${Date.now()}`,
        name,
        username: effectiveUsername,
        role:    decodedProfile?.role    || "",
        company: decodedProfile?.company || "",
        photo:   decodedProfile?.photo,
        tags:    decodedProfile?.tags    || [],
        bio:     decodedProfile?.bio,
        links:   decodedProfile?.links   || (effectiveUsername ? [{ type: "telegram", url: `https://t.me/${effectiveUsername}` }] : []),
      },
      metAt: new Date().toISOString(),
      followUpSent: false,
    };
    addStoredContact(contact);
    navigate(`/contact/${contactId}`);
  };

  const reset = () => {
    stopCamera();
    setState("idle");
    setScannedValue("");
    setErrorMsg("");
  };

  const startScan = () => {
    if (hasTgScanner) {
      startTelegramScan();
    } else {
      startCameraScan();
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Title */}
      <div className="px-5 pt-14 pb-5">
        <h1 style={{ fontSize: "34px", fontWeight: 700, color: "#0a1628", letterSpacing: "-0.5px" }}>
          Сканировать
        </h1>
        <p style={{ fontSize: "15px", color: "#8E8E93", marginTop: "4px" }}>
          Наведите камеру на QR-код собеседника
        </p>
      </div>

      {/* Viewfinder */}
      <div className="px-4 mb-5">
        <div
          className="relative aspect-square rounded-3xl overflow-hidden"
          style={{
            background: state === "idle"
              ? "linear-gradient(135deg, rgba(0,122,255,0.08) 0%, rgba(90,200,250,0.12) 100%)"
              : "#0a0a0a",
            border: state === "idle" ? "0.5px solid rgba(0,122,255,0.18)" : "none",
          }}
        >
          {/* Video stream */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            style={{ display: state === "scanning" && !hasTgScanner ? "block" : "none" }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Idle overlay */}
          {state === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-52 h-52 relative">
                {[
                  "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-2xl",
                  "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-2xl",
                  "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-2xl",
                  "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-2xl",
                ].map((cls, i) => (
                  <div key={i} className={`absolute w-9 h-9 ${cls}`} style={{ borderColor: "#007AFF" }} />
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <QrCode className="w-16 h-16" style={{ color: "rgba(0,122,255,0.3)" }} />
                </div>
              </div>
              <p style={{ color: "#8E8E93", fontSize: "14px", marginTop: "20px", fontWeight: 500 }}>
                Нажмите «Включить камеру»
              </p>
            </div>
          )}

          {/* Scanning overlay (camera mode) */}
          {state === "scanning" && !hasTgScanner && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ border: "3px solid rgba(52,199,89,0.8)", borderRadius: "24px" }}
            >
              <motion.div
                className="absolute left-0 right-0 h-0.5"
                style={{ background: "linear-gradient(90deg, transparent, #34C759, transparent)" }}
                animate={{ top: ["5%", "95%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <div
                className="absolute bottom-3 left-0 right-0 flex items-center justify-center"
                style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px" }}
              >
                {hasBarcodeDetector ? "Сканирование…" : "Камера готова — наведите на QR"}
              </div>
            </motion.div>
          )}

          {/* Scanning overlay (Telegram mode) */}
          {state === "scanning" && hasTgScanner && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              >
                <RefreshCw className="w-12 h-12" style={{ color: "#34C759" }} />
              </motion.div>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", marginTop: "16px" }}>
                Открывается нативный сканер…
              </p>
            </div>
          )}

          {/* Done overlay */}
          {state === "done" && (() => {
            const { display } = parseScanned(scannedValue);
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8"
                style={{ background: "#34C759" }}
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                  style={{ background: "rgba(255,255,255,0.25)" }}
                >
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: 700, color: "white", marginBottom: "6px" }}>
                  QR считан!
                </h3>
                <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>
                  {display}
                </p>
                <button
                  onClick={handleSave}
                  className="w-full rounded-[14px] font-semibold transition-all active:scale-97"
                  style={{ background: "rgba(255,255,255,0.9)", color: "#34C759", height: "50px", fontSize: "17px" }}
                >
                  Сохранить контакт
                </button>
              </motion.div>
            );
          })()}

          {/* Error overlay */}
          {state === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(255,59,48,0.15)" }}>
                <X className="w-8 h-8" style={{ color: "#FF3B30" }} />
              </div>
              <p style={{ color: "white", fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>Ошибка камеры</p>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>{errorMsg}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 space-y-2.5 mb-5">
        {(state === "idle" || state === "error") && (
          <button
            onClick={startScan}
            className="w-full flex items-center justify-center gap-2 rounded-[14px] text-white font-semibold transition-all active:scale-97"
            style={{
              background: "linear-gradient(180deg, #3AA3FF 0%, #007AFF 50%, #0063D1 100%)",
              height: "50px", fontSize: "17px",
              boxShadow: "0 4px 20px rgba(0,122,255,0.45), inset 0 1px 0 rgba(255,255,255,0.28)",
            }}
          >
            <Camera className="w-5 h-5" />
            {hasTgScanner ? "Открыть сканер" : "Включить камеру"}
          </button>
        )}

        {state === "scanning" && !hasTgScanner && (
          <button
            onClick={reset}
            className="w-full flex items-center justify-center gap-2 rounded-[14px] font-semibold transition-all active:scale-97"
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(20px)",
              border: "0.5px solid rgba(0,0,0,0.1)",
              color: "#FF3B30", height: "50px", fontSize: "17px",
            }}
          >
            <X className="w-5 h-5" /> Отменить
          </button>
        )}

        {state === "done" && (
          <button
            onClick={reset}
            className="w-full rounded-[14px] font-semibold transition-all active:scale-97"
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(20px)",
              border: "0.5px solid rgba(0,0,0,0.1)",
              color: "#007AFF", height: "50px", fontSize: "17px",
            }}
          >
            Сканировать ещё
          </button>
        )}
      </div>

      {/* Tips */}
      <div className="mx-4 glass-card p-4">
        <p style={{ fontWeight: 600, fontSize: "14px", color: "#0a1628", marginBottom: "10px" }}>Советы</p>
        <ul className="space-y-2">
          {[
            hasTgScanner
              ? "Используется нативный сканер Telegram — самый быстрый"
              : hasBarcodeDetector
                ? "QR-код определяется автоматически без нажатий"
                : "Наведите камеру точно на QR-код и держите ровно",
            "Держите камеру на расстоянии 15–25 см",
            "Убедитесь, что QR-код хорошо освещён",
          ].map((tip) => (
            <li key={tip} className="flex gap-2" style={{ fontSize: "13px", color: "#8E8E93" }}>
              <span style={{ color: "#007AFF" }}>·</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
