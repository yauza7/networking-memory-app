import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

interface Props {
  onFinish: () => void;
}

const WHALE_POINTS: [number, number, boolean?][] = [
  [80,65],[90,60],[100,55],[110,52],[120,50],[130,50],[140,50],
  [150,51],[160,52],[170,54],[180,56],[190,58],[195,62],
  [195,68],[190,72],[180,74],[170,75],[160,75],[150,74],
  [140,73],[130,72],[120,71],[110,70],[100,68],[90,67],[82,66],
  // хвостовой плавник
  [160,50],[165,42],[170,36],[168,50],
  // спинной плавник
  [205,55],[215,48],[210,60],[220,58],[215,68],[205,70],
  // брюхо / наполнение
  [130,60],[140,60],[150,60],[160,60],[170,62],[180,62],
  [130,65],[140,65],[150,65],[160,65],[170,65],
  [110,62],[120,62],[140,55],[150,55],[160,55],
  [120,64],[130,63],[150,63],[160,63],
  // глаз — последний
  [120,58,true],
];

const DOT_DELAY_MS = 17;
const TOTAL_DURATION_MS = 2600;

export function SplashScreen({ onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [whaleComplete, setWhaleComplete] = useState(false);
  const [fading, setFading] = useState(false);

  // Рисуем кита точка за точкой
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ретина-дисплей
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 300 * dpr;
    canvas.height = 130 * dpr;
    canvas.style.width = "300px";
    canvas.style.height = "130px";
    ctx.scale(dpr, dpr);

    let i = 0;
    let timer: ReturnType<typeof setTimeout>;

    function drawNext() {
      if (i >= WHALE_POINTS.length) {
        setWhaleComplete(true);
        return;
      }
      const [x, y, isEye] = WHALE_POINTS[i];

      ctx!.beginPath();
      if (isEye) {
        ctx!.arc(x, y, 3, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(20,60,100,0.95)";
      } else {
        ctx!.arc(x, y, 2.5, 0, Math.PI * 2);
        const alpha = (0.5 + Math.random() * 0.4).toFixed(2);
        ctx!.fillStyle = `rgba(61,122,170,${alpha})`;
      }
      ctx!.fill();

      i++;
      timer = setTimeout(drawNext, DOT_DELAY_MS);
    }

    // Небольшая пауза перед стартом
    timer = setTimeout(drawNext, 350);
    return () => clearTimeout(timer);
  }, []);

  // Старт фейдаута через 2.6 секунды
  useEffect(() => {
    const t = setTimeout(() => {
      setFading(true);
      setTimeout(onFinish, 500);
    }, TOTAL_DURATION_MS);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <motion.div
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(160deg, #c8dff0 0%, #ddeef9 45%, #f0f8ff 100%)",
      }}
    >
      {/* Кит */}
      <motion.div
        animate={
          whaleComplete
            ? { scale: [1, 1.03, 1] }
            : { scale: 1 }
        }
        transition={
          whaleComplete
            ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
            : {}
        }
      >
        <canvas ref={canvasRef} />
      </motion.div>

      {/* Логотип W·52 */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: whaleComplete ? 1 : 0, y: whaleComplete ? 0 : 6 }}
        transition={{ delay: 0.25, duration: 0.7, ease: "easeOut" }}
        className="mt-6 text-[#1a3a52] tracking-widest"
        style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: "2rem",
          letterSpacing: "0.12em",
        }}
      >
        W·52
      </motion.div>

      {/* Слоган */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: whaleComplete ? 0.55 : 0 }}
        transition={{ delay: 0.75, duration: 0.8, ease: "easeOut" }}
        className="mt-2 text-[#3d7aaa] text-xs tracking-[0.2em] uppercase"
      >
        every signal finds its receiver
      </motion.div>
    </motion.div>
  );
}
