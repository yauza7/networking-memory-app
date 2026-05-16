/**
 * W·52 — Tour (Onboarding Walkthrough)
 * Короткий тур по фишкам после Setup'а.
 * 8 слайдов: знакомство → скан → визитка → ручной → голос → теги → CSV → задачи.
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  QrCode,
  Plus,
  Mic,
  Tag,
  Bell,
  Sparkles,
  Send,
  Users,
  ScanLine,
  MessageCircle,
  Filter,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import {
  Atmosphere,
  Sonar,
  W52Mark,
  Hero,
  IvoryBtn,
  GhostBtn,
  CoordLine,
  Avatar,
  cardStyle,
} from "../components/brand/Brand";

const TOTAL_STEPS = 8;

export function Tour({ onComplete }: { onComplete?: () => void } = {}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const finish = () => {
    localStorage.setItem("w52_tour_completed", "1");
    if (onComplete) onComplete();
    else navigate("/", { replace: true });
  };

  const next = () => {
    if (step >= TOTAL_STEPS - 1) finish();
    else setStep((s) => s + 1);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ivory)",
        position: "relative",
        paddingBottom: 140,
      }}
    >
      <Atmosphere intensity={0.4} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ padding: "56px 18px 0" }}>
          <CoordLine left="ECHO · TOUR" right={`${step + 1} / ${TOTAL_STEPS}`} />
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            justifyContent: "center",
            marginTop: 20,
            padding: "0 22px",
          }}
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 3,
                borderRadius: 2,
                flex: 1,
                maxWidth: 40,
                background: i <= step ? "var(--signal)" : "var(--line-soft)",
                transition: "background 0.3s ease",
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28 }}
            style={{ padding: "32px 22px 0" }}
          >
            {step === 0 && <SlideWelcome />}
            {step === 1 && <SlideScan />}
            {step === 2 && <SlideMyCard />}
            {step === 3 && <SlideManual />}
            {step === 4 && <SlideVoice />}
            {step === 5 && <SlideTags />}
            {step === 6 && <SlideCSV />}
            {step === 7 && <SlideFollowUp />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px 18px 28px",
          background:
            "linear-gradient(180deg, transparent 0%, var(--bg) 35%)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <IvoryBtn onClick={next}>
            {step === TOTAL_STEPS - 1 ? "Начать работу" : "Далее"}
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
          {step < TOTAL_STEPS - 1 && (
            <GhostBtn onClick={finish}>Пропустить тур</GhostBtn>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Layout helpers ─────────────────────────────────────────

function SlideShell({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="eyebrow"
        style={{ color: "var(--signal-dim)", marginBottom: 8 }}
      >
        {eyebrow}
      </p>
      <Hero size={30}>{title}</Hero>
      {lead && (
        <p
          className="font-serif it text-muted-w"
          style={{
            fontSize: 15.5,
            lineHeight: 1.5,
            marginTop: 10,
            maxWidth: 360,
          }}
        >
          {lead}
        </p>
      )}
      <div style={{ marginTop: 20 }}>{children}</div>
    </div>
  );
}

function BulletRow({
  icon,
  iconColor,
  iconBg,
  title,
  text,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "11px 13px",
        background: "var(--surface)",
        border: "1px solid var(--line-soft)",
        borderRadius: 14,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: iconBg,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--sans)",
            fontWeight: 500,
            fontSize: 13.5,
            color: "var(--ivory)",
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        <div
          className="text-muted-w"
          style={{ fontSize: 12, lineHeight: 1.4 }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

// ─── Slides ─────────────────────────────────────────────────

function SlideWelcome() {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          position: "relative",
          width: 160,
          height: 120,
          margin: "0 auto 14px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Sonar size={140} rings={4} opacity={0.45} />
        </div>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
          }}
        >
          <W52Mark size={72} color="var(--ivory)" glow />
        </div>
      </div>
      <p
        className="eyebrow"
        style={{ color: "var(--signal-dim)", marginBottom: 6 }}
      >
        ДОБРО ПОЖАЛОВАТЬ
      </p>
      <Hero size={32}>Профиль готов</Hero>
      <p
        className="font-serif it text-muted-w"
        style={{
          fontSize: 15.5,
          lineHeight: 1.5,
          marginTop: 12,
          maxWidth: 320,
          margin: "12px auto 0",
        }}
      >
        Минута — и покажу все фишки.
      </p>
      <div
        style={{
          marginTop: 22,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          textAlign: "left",
        }}
      >
        <BulletRow
          icon={<ScanLine className="w-4 h-4" />}
          iconBg="oklch(0.86 0.13 195 / 0.18)"
          iconColor="var(--signal)"
          title="QR-обмен"
          text="Скан — и контакт у тебя."
        />
        <BulletRow
          icon={<Mic className="w-4 h-4" />}
          iconBg="oklch(0.80 0.110 65 / 0.18)"
          iconColor="var(--amber)"
          title="Голос + AI"
          text="Наговори контекст — AI разложит."
        />
        <BulletRow
          icon={<Bell className="w-4 h-4" />}
          iconBg="oklch(0.86 0.13 195 / 0.18)"
          iconColor="var(--signal)"
          title="Follow-up"
          text="Напомнит написать через 3 дня."
        />
      </div>
    </div>
  );
}

function SlideScan() {
  return (
    <SlideShell
      eyebrow="ФИШКА №1"
      title="Сканируй любой QR"
      lead="Распознаём и обычный Telegram-QR, и Echo-визитку."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            ...cardStyle,
            padding: "20px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            background: "var(--surface)",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, oklch(0.86 0.13 195 / 0.20), oklch(0.62 0.105 195 / 0.10))",
              border: "1px solid var(--signal-dim)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <QrCode className="w-9 h-9" style={{ color: "var(--signal)" }} />
          </div>
          <div
            style={{ fontSize: 22, color: "var(--signal-dim)", fontWeight: 300 }}
          >
            →
          </div>
          <Avatar name="A" size={56} />
        </div>

        <BulletRow
          icon={<ScanLine className="w-4 h-4" />}
          iconBg="oklch(0.86 0.13 195 / 0.18)"
          iconColor="var(--signal)"
          title="Кнопка «Сканировать»"
          text="По центру дашборда."
        />
        <BulletRow
          icon={<Users className="w-4 h-4" />}
          iconBg="oklch(0.80 0.110 65 / 0.18)"
          iconColor="var(--amber)"
          title="Авто-сохранение"
          text="Имя и @username подтягиваются. Если у него Echo — обмен взаимный."
        />
      </div>
    </SlideShell>
  );
}

function SlideMyCard() {
  return (
    <SlideShell
      eyebrow="ФИШКА №2"
      title="Своя визитка"
      lead="Тебя тоже сканируют — твой QR на главной."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            ...cardStyle,
            padding: 18,
            background: "var(--surface)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: 16,
              background: "var(--ivory)",
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gridTemplateRows: "repeat(8, 1fr)",
              padding: 10,
              gap: 2,
            }}
          >
            {Array.from({ length: 64 }).map((_, i) => {
              const seed = (i * 7 + 3) % 5;
              return (
                <div
                  key={i}
                  style={{
                    background:
                      seed < 2 ? "var(--abyss)" : "transparent",
                    borderRadius: 1,
                  }}
                />
              );
            })}
          </div>
          <p
            style={{
              fontFamily: "var(--serif)",
              fontSize: 16,
              color: "var(--ivory)",
              margin: 0,
            }}
          >
            Твой QR
          </p>
        </div>

        <BulletRow
          icon={<QrCode className="w-4 h-4" />}
          iconBg="oklch(0.86 0.13 195 / 0.18)"
          iconColor="var(--signal)"
          title="«Моя визитка» сверху"
          text="Один тап — открывается на весь экран."
        />
        <BulletRow
          icon={<Send className="w-4 h-4" />}
          iconBg="oklch(0.80 0.110 65 / 0.18)"
          iconColor="var(--amber)"
          title="Или поделись ссылкой"
          text="Если без камеры — прямая ссылка на профиль."
        />
      </div>
    </SlideShell>
  );
}

function SlideManual() {
  return (
    <SlideShell
      eyebrow="ФИШКА №3"
      title="Ручной ввод"
      lead="Если без камеры — добавь по @username за 20 секунд."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            ...cardStyle,
            padding: 14,
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "var(--ivory)",
              color: "var(--abyss)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Plus className="w-6 h-6" strokeWidth={2.4} />
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: "var(--sans)",
                fontWeight: 500,
                fontSize: 13.5,
                color: "var(--ivory)",
                margin: 0,
              }}
            >
              Кнопка «+» в навигации
            </p>
            <p
              className="text-muted-w"
              style={{ fontSize: 12, marginTop: 2 }}
            >
              По центру таб-бара.
            </p>
          </div>
        </div>

        <BulletRow
          icon={<Send className="w-4 h-4" />}
          iconBg="oklch(0.86 0.13 195 / 0.18)"
          iconColor="var(--signal)"
          title="Минимум — @username"
          text="Остальное допишешь сам."
        />
        <BulletRow
          icon={<Tag className="w-4 h-4" />}
          iconBg="oklch(0.80 0.110 65 / 0.18)"
          iconColor="var(--amber)"
          title="Сразу проставь теги и событие"
          text="Чтобы потом найти за секунду."
        />
      </div>
    </SlideShell>
  );
}

function SlideVoice() {
  return (
    <SlideShell
      eyebrow="ФИШКА №4"
      title="Голос + AI"
      lead="Сразу после знакомства — наговори контекст."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            ...cardStyle,
            padding: "18px 16px",
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, var(--signal) 0%, oklch(0.62 0.105 195 / 0.5) 80%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 24px oklch(0.62 0.105 195 / 0.5)",
              flexShrink: 0,
            }}
          >
            <Mic className="w-5 h-5" style={{ color: "var(--abyss)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                gap: 3,
                alignItems: "center",
                height: 22,
              }}
            >
              {[8, 14, 20, 16, 22, 10, 18, 12, 24, 14, 8, 16, 20].map(
                (h, i) => (
                  <div
                    key={i}
                    style={{
                      width: 2,
                      height: h,
                      borderRadius: 1,
                      background: "var(--signal)",
                      opacity: 0.4 + (i % 3) * 0.2,
                    }}
                  />
                )
              )}
            </div>
            <p
              className="text-muted-w"
              style={{ fontSize: 11.5, marginTop: 6 }}
            >
              Live-распознавание речи
            </p>
          </div>
        </div>

        <BulletRow
          icon={<Sparkles className="w-4 h-4" />}
          iconBg="oklch(0.80 0.110 65 / 0.18)"
          iconColor="var(--amber)"
          title="AI делает саммари"
          text="Из 2 минут речи — 3 строки и задача."
        />
        <BulletRow
          icon={<MessageCircle className="w-4 h-4" />}
          iconBg="oklch(0.86 0.13 195 / 0.18)"
          iconColor="var(--signal)"
          title="Прикрепляется к контакту"
          text="Через месяц вспомнишь, кто это."
        />
      </div>
    </SlideShell>
  );
}

function SlideTags() {
  const sampleTags = [
    { label: "Buying", color: "var(--signal)" },
    { label: "SEO", color: "var(--amber)" },
    { label: "Gambling", color: "var(--signal-dim)" },
    { label: "HR", color: "var(--signal)" },
    { label: "Конференции", color: "var(--amber)" },
  ];
  return (
    <SlideShell
      eyebrow="ФИШКА №5"
      title="Теги и фильтры"
      lead="Через год — 300 контактов. С тегами найдёшь нужного за секунду."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            ...cardStyle,
            padding: 14,
            background: "var(--surface)",
          }}
        >
          <p
            className="eyebrow"
            style={{
              color: "var(--signal-dim)",
              marginBottom: 10,
              paddingLeft: 2,
            }}
          >
            КОМАНДА · ТРАФИК · ВЕРТИКАЛИ
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {sampleTags.map((t) => (
              <span
                key={t.label}
                style={{
                  padding: "5px 11px",
                  borderRadius: 100,
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  background: "transparent",
                  color: t.color,
                  border: `1px solid ${t.color}`,
                }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>

        <BulletRow
          icon={<Tag className="w-4 h-4" />}
          iconBg="oklch(0.86 0.13 195 / 0.18)"
          iconColor="var(--signal)"
          title="3 группы"
          text="Команда / Трафик / Вертикали."
        />
        <BulletRow
          icon={<Filter className="w-4 h-4" />}
          iconBg="oklch(0.80 0.110 65 / 0.18)"
          iconColor="var(--amber)"
          title="Фильтр на «Контактах»"
          text="Свайпай чипы — список сужается. Можно ещё по событию."
        />
      </div>
    </SlideShell>
  );
}

function SlideCSV() {
  return (
    <SlideShell
      eyebrow="ФИШКА №6"
      title="Отчёты в CSV"
      lead="Один тап — и все контакты в Excel. Удобно для отчётов тимлиду."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* CSV mock */}
        <div
          style={{
            ...cardStyle,
            padding: 14,
            background: "var(--surface)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 1,
              background: "var(--line-soft)",
              border: "1px solid var(--line-soft)",
              borderRadius: 8,
              overflow: "hidden",
              fontFamily: "var(--mono)",
              fontSize: 10,
            }}
          >
            {[
              ["Имя", "Компания", "Теги"],
              ["Маргарита Янс", "G GATE", "Конференции"],
              ["Anton Khomenok", "X6 Agency", "Buying · TG"],
              ["Alex Nomad", "SEO DT", "SEO · Gambling"],
            ].map((row, ri) =>
              row.map((cell, ci) => (
                <div
                  key={`${ri}-${ci}`}
                  style={{
                    padding: "7px 9px",
                    background: ri === 0 ? "var(--surface2)" : "var(--surface)",
                    color: ri === 0 ? "var(--signal-dim)" : "var(--ivory)",
                    fontWeight: ri === 0 ? 500 : 400,
                    textTransform: ri === 0 ? "uppercase" : "none",
                    letterSpacing: ri === 0 ? "0.04em" : "0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cell}
                </div>
              ))
            )}
          </div>
        </div>

        <BulletRow
          icon={<Filter className="w-4 h-4" />}
          iconBg="oklch(0.80 0.110 65 / 0.18)"
          iconColor="var(--amber)"
          title="Сначала фильтр"
          text="Например: «SEO + Gambling». Только нужные строки."
        />
        <BulletRow
          icon={<Download className="w-4 h-4" />}
          iconBg="oklch(0.86 0.13 195 / 0.18)"
          iconColor="var(--signal)"
          title="Затем «Экспорт»"
          text="Настройки → Экспорт контактов. Имя, компания, теги, дата, событие."
        />
        <BulletRow
          icon={<FileSpreadsheet className="w-4 h-4" />}
          iconBg="oklch(0.86 0.13 195 / 0.18)"
          iconColor="var(--signal)"
          title="Открывается в Excel / Numbers"
          text="Готовый отчёт по итогам конфы — за 5 секунд."
        />
      </div>
    </SlideShell>
  );
}

function SlideFollowUp() {
  return (
    <SlideShell
      eyebrow="ПОСЛЕДНЕЕ"
      title="Follow-up задачи"
      lead="Echo сам напомнит написать через 3 дня. Не пропадёшь с радара."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div
          style={{
            ...cardStyle,
            padding: "12px 14px",
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "oklch(0.86 0.13 195 / 0.18)",
              color: "var(--signal)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MessageCircle className="w-4 h-4" />
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: "var(--sans)",
                fontWeight: 500,
                fontSize: 13.5,
                color: "var(--ivory)",
                margin: 0,
              }}
            >
              Написать Маргарите
            </p>
            <p
              className="text-muted-w"
              style={{ fontSize: 11.5, marginTop: 2 }}
            >
              Через 3 дня · G GATE CONF
            </p>
          </div>
          <span
            style={{
              padding: "4px 9px",
              borderRadius: 100,
              background: "oklch(0.86 0.13 195 / 0.18)",
              color: "var(--signal)",
              fontFamily: "var(--mono)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Написать
          </span>
        </div>

        <BulletRow
          icon={<Bell className="w-4 h-4" />}
          iconBg="oklch(0.86 0.13 195 / 0.18)"
          iconColor="var(--signal)"
          title="Пинг прямо в Telegram"
          text="Без открытия приложения."
        />
        <BulletRow
          icon={<Sparkles className="w-4 h-4" />}
          iconBg="oklch(0.80 0.110 65 / 0.18)"
          iconColor="var(--amber)"
          title="AI напишет сообщение"
          text="Один тап — учтёт ваш контекст."
        />
      </div>
    </SlideShell>
  );
}
