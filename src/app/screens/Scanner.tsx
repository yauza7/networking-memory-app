/**
 * W·52 — Scanner
 * Moody sonar viewfinder, одна широкая кнопка "Открыть сканер",
 * подробная памятка-tips снизу.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Sonar,
  FreqBars,
  RoundBtn,
  Hero,
  cardStyle,
} from "../components/brand/Brand";

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
  const [hasTgScanner] = useState(
    () => !!(window as any).Telegram?.WebApp?.showScanQrPopup
  );
  const [hasBarcodeDetector] = useState(() => "BarcodeDetector" in window);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startTelegramScan = () => {
    const tg = (window as any).Telegram?.WebApp;
    setState("scanning");
    tg.showScanQrPopup({ text: "Наведите на QR-код контакта" }, (text: string) => {
      tg.closeScanQrPopup();
      handleResult(text);
      return true;
    });
  };

  const startCameraScan = async () => {
    setState("scanning");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (hasBarcodeDetector) {
        try {
          detectorRef.current = new (window as any).BarcodeDetector({
            formats: ["qr_code"],
          });
        } catch {
          detectorRef.current = null;
        }
      }
      scanLoop();
    } catch (e: any) {
      stopCamera();
      setState("error");
      if (e?.name === "NotAllowedError")
        setErrorMsg("Нет доступа к камере. Разрешите доступ в настройках браузера.");
      else setErrorMsg("Не удалось открыть камеру.");
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
      detectorRef.current
        .detect(canvas)
        .then((codes: any[]) => {
          if (codes.length > 0) handleResult(codes[0].rawValue);
          else rafRef.current = requestAnimationFrame(scanLoop);
        })
        .catch(() => {
          rafRef.current = requestAnimationFrame(scanLoop);
        });
    } else {
      rafRef.current = requestAnimationFrame(scanLoop);
    }
  }, []); // eslint-disable-line

  const sanitizeStr = (v: unknown, max = 200): string =>
    typeof v === "string" ? v.replace(/[<>]/g, "").slice(0, max) : "";
  const sanitizeUsername = (v: unknown): string => {
    if (typeof v !== "string") return "";
    const cleaned = v.replace(/^@/, "").match(/^[a-zA-Z0-9_]{1,32}$/);
    return cleaned ? cleaned[0] : "";
  };
  const decodeNameFromD = (d: string): string => {
    try {
      if (d.length > 4000) return "";
      const json = decodeURIComponent(escape(atob(d)));
      const parsed = JSON.parse(json);
      return sanitizeStr(parsed?.n, 80);
    } catch {
      return "";
    }
  };
  const parseScanned = (text: string): { display: string; username: string } => {
    try {
      const url = new URL(text);
      const segs = url.pathname.split("/").filter(Boolean);
      const d = url.searchParams.get("d") || "";
      const nameFromD = d ? decodeNameFromD(d) : "";
      if (segs[0] === "u" && segs[1])
        return { display: nameFromD || segs[1], username: segs[1] };
      if (url.hostname === "t.me" && segs[0])
        return { display: nameFromD || segs[0], username: segs[0] };
      return { display: url.hostname, username: "" };
    } catch {
      return {
        display: text.length > 40 ? text.slice(0, 40) + "…" : text,
        username: "",
      };
    }
  };

  const handleResult = (text: string) => {
    stopCamera();
    const safe = typeof text === "string" ? text.slice(0, 4000) : "";
    setScannedValue(safe);
    setState("done");
  };

  const handleSave = () => {
    let username = "";
    let d = "";
    try {
      const url = new URL(scannedValue);
      const segs = url.pathname.split("/").filter(Boolean);
      d = url.searchParams.get("d") || "";
      if (segs[0] === "u" && segs[1]) username = sanitizeUsername(segs[1]);
      else if (url.hostname === "t.me" && segs[0])
        username = sanitizeUsername(segs[0]);
    } catch {}
    const params = new URLSearchParams();
    if (username) params.set("username", username);
    if (d) params.set("d", d);
    navigate(`/add-contact?${params.toString()}`);
  };

  const reset = () => {
    stopCamera();
    setState("idle");
    setScannedValue("");
    setErrorMsg("");
  };

  const startScan = () => {
    if (hasTgScanner) startTelegramScan();
    else startCameraScan();
  };

  const isLive = state === "scanning" && !hasTgScanner;

  const tips = [
    "Сканируй любой Telegram QR-код — даже без Echo-профиля.",
    "Echo-визитки добавляют контакт со всеми данными сразу.",
    hasTgScanner
      ? "Нативный сканер Telegram — самый быстрый."
      : hasBarcodeDetector
      ? "QR определяется автоматически — просто наведи камеру."
      : "Наведи камеру на QR и держи ровно.",
    "Расстояние 15–25 см, хорошее освещение.",
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ivory)",
        paddingBottom: 120,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* atmospheric glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(60% 50% at 50% 38%, oklch(0.22 0.05 200 / 0.6), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* header */}
      <div
        style={{
          padding: "60px 18px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        <RoundBtn onClick={() => navigate(-1)}>
          <svg width="10" height="14" viewBox="0 0 10 14">
            <path
              d="M8 1L2 7l6 6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </RoundBtn>
        <span
          className="font-mono"
          style={{
            fontSize: 11,
            color: "var(--muted-fg)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          Сканер
        </span>
        <div style={{ width: 38 }} />
      </div>

      {/* hero text */}
      <div
        style={{
          textAlign: "center",
          padding: "20px 28px 0",
          position: "relative",
          zIndex: 2,
        }}
      >
        <Hero size={26}>Сканировать QR</Hero>
        <p
          className="font-serif it text-muted-w"
          style={{
            fontSize: 14.5,
            marginTop: 6,
            lineHeight: 1.5,
            maxWidth: 280,
            marginInline: "auto",
          }}
        >
          Наведи камеру на QR-код собеседника.
        </p>
      </div>

      {/* viewfinder */}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 24px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 260,
            height: 260,
            borderRadius: 24,
            border: "1px solid var(--line)",
            background: "var(--scanner-dark-bg)",
            overflow: "hidden",
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: isLive ? "block" : "none",
            }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* corner brackets */}
          {[
            { top: 10, left: 10, r: "0deg" },
            { top: 10, right: 10, r: "90deg" },
            { bottom: 10, right: 10, r: "180deg" },
            { bottom: 10, left: 10, r: "270deg" },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: c.top,
                left: c.left,
                right: c.right,
                bottom: c.bottom,
                width: 28,
                height: 28,
                transform: `rotate(${c.r})`,
                borderTop: "2px solid var(--signal)",
                borderLeft: "2px solid var(--signal)",
              }}
            />
          ))}

          {/* sonar (when not live) */}
          {!isLive && state !== "done" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sonar size={220} rings={5} opacity={0.6} />
            </div>
          )}

          {/* sweep line */}
          {(state === "idle" || isLive) && (
            <motion.div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, var(--signal), transparent)",
                boxShadow: "0 0 12px var(--signal)",
              }}
              animate={{ top: ["10%", "90%", "10%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* DONE overlay */}
          {state === "done" &&
            (() => {
              const { display } = parseScanned(scannedValue);
              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 22px",
                    textAlign: "center",
                    background: "var(--bg)",
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "var(--signal)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                      boxShadow: "0 0 24px oklch(0.86 0.13 195 / 0.55)",
                    }}
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--abyss)"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="eyebrow" style={{ color: "var(--signal)" }}>
                    SIGNAL RECEIVED
                  </span>
                  <p
                    className="font-serif"
                    style={{
                      fontSize: 20,
                      marginTop: 8,
                      color: "var(--ivory)",
                      lineHeight: 1.2,
                    }}
                  >
                    {display}
                  </p>
                </motion.div>
              );
            })()}

          {/* ERROR overlay */}
          {state === "error" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 22px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "oklch(0.68 0.19 25 / 0.15)",
                  border: "1px solid var(--danger)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="var(--danger)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 500 }}>Ошибка камеры</p>
              <p
                className="text-faint"
                style={{ fontSize: 13, marginTop: 6, maxWidth: 220 }}
              >
                {errorMsg}
              </p>
            </div>
          )}
        </div>

        {/* SINGLE wide button */}
        <div style={{ marginTop: 22, width: "100%" }}>
          {(state === "idle" || state === "error") && (
            <button
              onClick={startScan}
              style={{
                width: "100%",
                height: 54,
                borderRadius: 16,
                background: "var(--signal)",
                color: "var(--abyss)",
                border: "none",
                fontFamily: "var(--sans)",
                fontSize: 15,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: "0 4px 24px oklch(0.86 0.13 195 / 0.30)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path
                  d="M2 5V2h3M13 2h3v3M16 13v3h-3M5 16H2v-3"
                  stroke="var(--abyss)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <rect x="5" y="6" width="2.5" height="2.5" stroke="var(--abyss)" strokeWidth="1.4" fill="none" />
                <rect x="10.5" y="6" width="2.5" height="2.5" stroke="var(--abyss)" strokeWidth="1.4" fill="none" />
                <rect x="5" y="9.5" width="2.5" height="2.5" stroke="var(--abyss)" strokeWidth="1.4" fill="none" />
                <rect x="10.5" y="9.5" width="1.1" height="1.1" fill="var(--abyss)" />
                <rect x="12" y="11.5" width="1" height="1" fill="var(--abyss)" />
              </svg>
              Открыть сканер
            </button>
          )}
          {state === "scanning" && !hasTgScanner && (
            <button
              onClick={reset}
              style={{
                width: "100%",
                height: 54,
                borderRadius: 16,
                background: "var(--surface)",
                color: "var(--ivory)",
                border: "1px solid var(--line-soft)",
                fontFamily: "var(--sans)",
                fontSize: 15,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Отменить
            </button>
          )}
          {state === "done" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={reset}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 14,
                  background: "var(--surface)",
                  color: "var(--ivory)",
                  border: "1px solid var(--line-soft)",
                  fontFamily: "var(--sans)",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Ещё
              </button>
              <button
                onClick={handleSave}
                style={{
                  flex: 2,
                  height: 50,
                  borderRadius: 14,
                  background: "var(--ivory)",
                  color: "var(--abyss)",
                  border: "none",
                  fontFamily: "var(--sans)",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Сохранить контакт
              </button>
            </div>
          )}
        </div>

        {/* TIPS */}
        <div style={{ ...cardStyle, marginTop: 24, padding: "16px 18px", width: "100%" }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            КАК ОТСКАНИРОВАТЬ
          </div>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {tips.map((tip, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  fontFamily: "var(--sans)",
                  fontSize: 13,
                  color: "var(--muted-fg)",
                  lineHeight: 1.5,
                }}
              >
                <span
                  className="font-mono"
                  style={{
                    color: "var(--signal-dim)",
                    fontSize: 11,
                    minWidth: 18,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* bottom hz strip */}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: 22,
          right: 22,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 1,
          pointerEvents: "none",
          opacity: 0.55,
        }}
      >
        <span
          className="font-mono"
          style={{
            fontSize: 9.5,
            color: "var(--faint)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Sweeping · 52.000 Hz
        </span>
        <FreqBars
          strength={state === "scanning" ? 0.7 : 0.35}
          count={10}
          height={9}
        />
      </div>
    </div>
  );
}
