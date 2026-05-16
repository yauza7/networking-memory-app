/**
 * W·52 — Splash
 * Полностью центрированный, без auto-finish.
 * Переход только по нажатию "Поехали".
 */
import { useState } from "react";
import { motion } from "motion/react";
import { Atmosphere, Sonar, W52Mark, IvoryBtn, Hero } from "../components/brand/Brand";

interface Props {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: Props) {
  const [fading, setFading] = useState(false);

  const handleStart = () => {
    setFading(true);
    setTimeout(onFinish, 350);
  };

  return (
    <motion.div
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[100]"
      style={{
        background: "var(--bg)",
        color: "var(--ivory)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Atmosphere intensity={0.6} />

      {/* Centered hero — sonar + whale + tagline */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
          position: "relative",
          zIndex: 1,
          gap: 28,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{
            position: "relative",
            width: 240,
            height: 180,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sonar size={220} rings={5} opacity={0.55} />
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "absolute" }}
          >
            <W52Mark size={88} color="var(--ivory)" glow />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <span className="eyebrow" style={{ color: "var(--signal)" }}>
            WHALE · 52 HZ
          </span>
          <Hero size={42}>
            Every signal<br />
            <span className="it" style={{ color: "var(--signal)" }}>
              finds its receiver.
            </span>
          </Hero>
          <p
            className="font-serif it text-muted-w"
            style={{
              fontSize: 16,
              margin: "6px auto 0",
              lineHeight: 1.55,
              maxWidth: 280,
            }}
          >
            Память о встречах, которые не должны раствориться.
          </p>
        </motion.div>
      </div>

      {/* CTA pinned to bottom */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6, ease: "easeOut" }}
        style={{
          padding: "0 22px",
          paddingBottom: "max(40px, env(safe-area-inset-bottom, 24px))",
          position: "relative",
          zIndex: 1,
        }}
      >
        <IvoryBtn onClick={handleStart}>
          Поехали
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M1 7h12M8 2l5 5-5 5"
              stroke="var(--abyss)"
              strokeWidth="1.7"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IvoryBtn>
        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--faint)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginTop: 14,
          }}
        >
          Listening · — · 52.000 Hz
        </div>
      </motion.div>
    </motion.div>
  );
}
