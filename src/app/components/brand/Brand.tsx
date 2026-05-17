/**
 * W·52 — Brand primitives
 *
 * Visual system shared across all screens:
 *   • Sonar / Waveform / FreqBars  — sonar/sea-signal motif
 *   • W52Mark                       — minimal whale silhouette
 *   • Avatar                        — circular photo / initial
 *   • Atmosphere                    — abyssal radial gradient
 *   • IvoryBtn / SignalBtn / GhostBtn / RoundBtn
 *   • Chip / CoordLine / SectionLabel / AISparkle
 *
 * Serif is reserved for hero only. Mono carries metadata.
 */
import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

// ─────────────────────────────────────────────────────────────
// W·52 whale silhouette
// ─────────────────────────────────────────────────────────────
export function W52Mark({
  size = 56,
  color = "currentColor",
  glow = false,
}: {
  size?: number;
  color?: string;
  glow?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size * 0.55}
      viewBox="0 0 100 55"
      fill="none"
      style={{ filter: glow ? "drop-shadow(0 0 12px var(--signal))" : "none" }}
    >
      <path
        d="M2 32 C 8 24, 18 20, 32 21 C 42 22, 52 26, 64 28 C 74 30, 84 28, 90 24 L 96 18 L 94 30 C 92 36, 86 40, 78 42 C 66 44, 52 42, 40 40 C 28 38, 14 38, 6 38 Z"
        fill={color}
        fillOpacity="0.95"
      />
      <circle cx="20" cy="29" r="0.9" fill="var(--abyss)" />
      <path
        d="M88 14 Q 90 10, 92 14 T 96 14"
        stroke={color}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Wordmark
// ─────────────────────────────────────────────────────────────
export function W52Wordmark({
  size = 22,
  color = "var(--ivory)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--serif)",
        fontSize: size,
        letterSpacing: "-0.025em",
        color,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      Echo<span style={{ color: "var(--signal)" }}>.</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Animated sine waveform — "52 Hz" decoration
// ─────────────────────────────────────────────────────────────
export function Waveform({
  width = 280,
  height = 40,
  strokeColor = "var(--signal)",
  strokeWidth = 1.25,
  density = 1,
  opacity = 1,
}: {
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  density?: number;
  opacity?: number;
}) {
  const pts: string[] = [];
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const x = (i / N) * width;
    const t = (i / N) * Math.PI * 2 * 6 * density;
    const env = 0.5 + 0.5 * Math.sin((i / N) * Math.PI);
    const y = height / 2 + Math.sin(t) * (height * 0.42) * env;
    pts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ opacity, display: "block" }}
    >
      <path
        d={pts.join(" ")}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// EQ / signal strength bars
// ─────────────────────────────────────────────────────────────
export function FreqBars({
  strength = 0.7,
  count = 12,
  height = 14,
  color = "var(--signal)",
  dimColor = "var(--line)",
}: {
  strength?: number;
  count?: number;
  height?: number;
  color?: string;
  dimColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height }}>
      {Array.from({ length: count }).map((_, i) => {
        const t = i / (count - 1);
        const env = 0.35 + 0.65 * Math.sin(t * Math.PI);
        const lit = i / count < strength;
        return (
          <div
            key={i}
            style={{
              width: 2,
              height: Math.max(2, env * height),
              background: lit ? color : dimColor,
              borderRadius: 1,
              opacity: lit ? 1 : 0.55,
            }}
          />
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar — photo (with fallback chain) or initials.
// Fallback chain: explicit `photo` → Telegram username userpic → initials.
// Tracks load failure in state so initials show only when every image fails.
// ─────────────────────────────────────────────────────────────
export function Avatar({
  name = "AB",
  size = 40,
  hue = 200,
  ring = true,
  photo,
  username,
}: {
  name?: string;
  size?: number;
  hue?: number;
  ring?: boolean;
  photo?: string;
  username?: string;
}) {
  // Build a fallback chain of candidate URLs
  const cleanUsername = username?.replace(/^@/, "");
  const candidates: string[] = [];
  if (photo) candidates.push(photo);
  if (cleanUsername)
    candidates.push(`https://t.me/i/userpic/320/${cleanUsername}.jpg`);

  const [idx, setIdx] = useState(0);
  // Reset when inputs change
  useEffect(() => {
    setIdx(0);
  }, [photo, cleanUsername]);

  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0] || "")
      .join("")
      .toUpperCase() || "·";
  const ringStyle = ring
    ? `1px solid oklch(0.62 0.10 ${hue} / 0.55)`
    : "none";

  const src = candidates[idx];

  if (src) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: ringStyle,
          overflow: "hidden",
          flexShrink: 0,
          background: `oklch(var(--avatar-initials-bg-l, 0.28) 0.04 ${hue})`,
        }}
      >
        <img
          src={src}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setIdx(idx + 1)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `oklch(var(--avatar-initials-bg-l, 0.28) 0.04 ${hue})`,
        border: ringStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: `oklch(var(--avatar-initials-text-l, 0.92) 0.03 ${hue})`,
        fontFamily: "var(--sans)",
        fontWeight: 500,
        fontSize: size * 0.38,
        letterSpacing: 0,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sonar — concentric rings (decorative)
// ─────────────────────────────────────────────────────────────
export function Sonar({
  size = 240,
  color = "var(--signal)",
  rings = 4,
  opacity = 0.5,
}: {
  size?: number;
  color?: string;
  rings?: number;
  opacity?: number;
}) {
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      {Array.from({ length: rings }).map((_, i) => {
        const t = (i + 1) / rings;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `1px solid ${color}`,
              transform: `scale(${t})`,
              opacity: opacity * (1 - t * 0.85),
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          transform: "translate(-50%,-50%)",
          boxShadow: `0 0 16px ${color}`,
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Atmosphere — radial gradient overlay (abyssal mood)
// ─────────────────────────────────────────────────────────────
export function Atmosphere({ intensity = 0.4 }: { intensity?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(120% 60% at 50% -10%, oklch(0.30 0.04 230 / ${
          intensity * 0.7
        }), transparent 60%), radial-gradient(80% 50% at 50% 110%, oklch(0.22 0.05 200 / ${intensity}), transparent 65%)`,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Buttons
// ─────────────────────────────────────────────────────────────
type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  h?: number;
  full?: boolean;
  disabled?: boolean;
  style?: CSSProperties;
  type?: "button" | "submit" | "reset";
};

export function IvoryBtn({
  children,
  onClick,
  h = 54,
  full = true,
  disabled,
  style,
  type = "button",
}: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: full ? "100%" : "auto",
        height: h,
        padding: "0 22px",
        borderRadius: 16,
        background: "var(--ivory)",
        color: "var(--abyss)",
        border: "none",
        fontFamily: "var(--sans)",
        fontSize: 15,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function SignalBtn({
  children,
  onClick,
  h = 54,
  full = true,
  disabled,
  style,
  type = "button",
}: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: full ? "100%" : "auto",
        height: h,
        padding: "0 22px",
        borderRadius: 16,
        background: "var(--signal)",
        color: "var(--abyss)",
        border: "none",
        fontFamily: "var(--sans)",
        fontSize: 15,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        boxShadow: "0 4px 24px oklch(0.86 0.13 195 / 0.30)",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function GhostBtn({
  children,
  onClick,
  h = 46,
  full = true,
  disabled,
  style,
  type = "button",
}: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: full ? "100%" : "auto",
        height: h,
        padding: "0 20px",
        borderRadius: 14,
        background: "var(--surface)",
        color: "var(--ivory)",
        border: "1px solid var(--line-soft)",
        fontFamily: "var(--sans)",
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: "-0.005em",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function RoundBtn({
  children,
  onClick,
  size = 38,
  ivory = false,
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  size?: number;
  ivory?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: ivory ? "var(--ivory)" : "var(--surface)",
        border: ivory ? "none" : "1px solid var(--line-soft)",
        color: ivory ? "var(--abyss)" : "var(--ivory)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Chip — pill filter
// ─────────────────────────────────────────────────────────────
export function Chip({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 13px",
        borderRadius: 100,
        background: active ? "var(--ivory)" : "transparent",
        color: active ? "var(--abyss)" : "var(--muted-fg)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
        flexShrink: 0,
        border: "1px solid " + (active ? "var(--ivory)" : "var(--line-soft)"),
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Coordinate line — mono caps at top of screens
// ─────────────────────────────────────────────────────────────
export function CoordLine({ left, right }: { left: string; right?: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "0 22px",
        fontFamily: "var(--mono)",
        fontSize: 10,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "var(--faint)",
      }}
    >
      <span>{left}</span>
      {right && <span>{right}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section label — mono eyebrow + thin rule
// ─────────────────────────────────────────────────────────────
export function SectionLabel({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        padding: "0 22px 10px",
      }}
    >
      <span className="eyebrow">{children}</span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: "var(--line-soft)",
          opacity: 0.6,
        }}
      />
      {right && (
        <span className="eyebrow" style={{ color: "var(--muted-fg)" }}>
          {right}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// AI sparkle glyph
// ─────────────────────────────────────────────────────────────
export function AISparkle({
  size = 14,
  color = "var(--signal)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6L8 1z"
        fill={color}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Screen wrapper — applies abyss background + serif/sans tokens
// ─────────────────────────────────────────────────────────────
export function Screen({
  children,
  scroll = false,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        minHeight: "100%",
        background: "var(--bg)",
        color: "var(--ivory)",
        fontFamily: "var(--sans)",
        position: "relative",
        overflow: scroll ? "visible" : "hidden",
        letterSpacing: "-0.005em",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero serif title — reserved for biggest titles only
// ─────────────────────────────────────────────────────────────
export function Hero({
  children,
  size = 32,
  style,
}: {
  children: ReactNode;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <h1
      style={{
        fontFamily: "var(--serif)",
        fontSize: size,
        lineHeight: 1.05,
        margin: 0,
        fontWeight: 400,
        letterSpacing: "-0.02em",
        color: "var(--ivory)",
        ...style,
      }}
    >
      {children}
    </h1>
  );
}

// ─────────────────────────────────────────────────────────────
// Card token (use as style spread)
// ─────────────────────────────────────────────────────────────
export const cardStyle: CSSProperties = {
  background: "var(--deep)",
  border: "1px solid var(--line-soft)",
  borderRadius: 18,
  padding: "14px 16px",
  color: "var(--ivory)",
};
