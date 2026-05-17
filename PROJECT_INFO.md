# Echo — Networking Memory App

> Telegram Mini App для нетворкинга на конференциях.  
> *Every signal finds its receiver.*

---

## Ссылки

| Что | Ссылка |
|-----|--------|
| Мини-апп (production) | https://w52-app.vercel.app |
| Telegram бот | [@Whale52hz_bot](https://t.me/Whale52hz_bot) |
| Открыть мини-апп в Telegram | https://t.me/Whale52hz_bot/w52 |
| GitHub репозиторий | https://github.com/yauza7/networking-memory-app |
| Vercel dashboard | https://vercel.com/surevshare-9022s-projects/w52-app |
| Политика конфиденциальности | https://w52-app.vercel.app/privacy.html |
| Условия использования | https://w52-app.vercel.app/terms.html |

---

## Бренд

- **Название:** Echo
- **Слоган:** Every signal finds its receiver.
- **Допустимые визуальные тексты:** 52 HZ, Whale, WHALE · 52 HZ
- **Легенда:** Где-то в океане плавает кит, который поёт на 52 Hz — частоте, которую не слышит никто из его сородичей.
- **Цветовая палитра (oklch):**
  - `--abyss`: oklch(0.130 0.025 240) — самый тёмный фон
  - `--bg`: oklch(0.155 0.025 240) — основной фон
  - `--signal`: oklch(0.86 0.130 195) — биолюминесцентный cyan (акцент)
  - `--ivory`: oklch(0.965 0.012 80) — текст
- **Типографика:** Instrument Serif (hero/логотип) · Instrument Sans (UI) · JetBrains Mono (метаданные, eyebrow)
- **Логотип:** `Echo.` — Instrument Serif, точка цвета `--signal`

---

## Стек технологий

| Технология | Версия | Зачем |
|------------|--------|-------|
| React | 18.3.1 | UI-фреймворк |
| Vite | 6.3.5 | Сборщик, dev-сервер |
| TypeScript | встроен в Vite | Типизация |
| Tailwind CSS | 4.1.12 | Стили |
| motion/react (Framer Motion) | 12.x | Анимации переходов |
| react-router | 7.13 | Клиентский роутинг |
| lucide-react | 0.487 | Иконки |
| date-fns | 3.6 | Форматирование дат |
| qrcode.react | 4.2 | Генерация QR-кода визитки |
| ioredis | 5.10 | Redis-клиент (TCP, задачи/голос/регистрации) |
| @vercel/node | 5.8 | Типы для Vercel Serverless Functions |
| Telegram Bot API | — | Бот, webhook, отправка файлов |
| HuggingFace Inference API | — | Whisper-large-v2 (транскрипция голоса) |
| Anthropic Claude API | claude-sonnet-4 | AI summary заметок, теги, follow-up |

---

## Структура проекта

```
/
├── index.html                  # Точка входа, viewport meta, Telegram WebApp SDK
│                               # Title: "Echo — Every signal finds its receiver."
├── vite.config.ts              # Конфиг Vite
├── vercel.json                 # Vercel: rewrites, crons, maxDuration
├── package.json
├── .env                        # ⛔ НЕ в Git — реальные ключи
├── .env.example                # ✅ В Git — шаблон
│
├── src/
│   ├── main.tsx                # React root, монтирование #root
│   ├── styles/                 # Глобальные CSS (Tailwind, glass-card, ios-tag, oklch переменные)
│   └── app/
│       ├── App.tsx             # Роутер, сплэш-гейт, Setup-гейт, Tour-гейт
│       │                       # Порядок: Splash → Setup → Tour → App
│       ├── components/
│       │   ├── Navigation.tsx      # Нижняя навигация (скрыта на /tour, /u/, /setup)
│       │   ├── ErrorBoundary.tsx   # Глобальный обработчик ошибок React
│       │   ├── WelcomeBanner.tsx   # Баннер «Echo Demo» (фиксированный, закрываемый)
│       │   ├── VisualCard.tsx      # Визуальная карточка контакта
│       │   └── brand/
│       │       └── Brand.tsx       # Дизайн-система: Atmosphere, Hero, Chip, Avatar,
│       │                           # SignalBtn, IvoryBtn, GhostBtn, RoundBtn, Sonar,
│       │                           # W52Mark, W52Wordmark, AISparkle, cardStyle
│       │
│       ├── screens/
│       │   ├── SplashScreen.tsx    # Заставка (сессионная, не показывается повторно)
│       │   │                       # Eyebrow: WHALE · 52 HZ
│       │   ├── Setup.tsx           # Регистрация: имя, должность, компания, username,
│       │   │                       # сайт, bio, теги (шаг 1 + шаг 2)
│       │   │                       # CoordLine: ECHO · IDENTITY
│       │   ├── Tour.tsx            # 8-слайдовый онбординг после Setup
│       │   │                       # localStorage key: w52_tour_completed
│       │   │                       # CoordLine: ECHO · TOUR
│       │   ├── Dashboard.tsx       # Главный экран — статистика, follow-up задачи
│       │   ├── Scanner.tsx         # QR-сканер (Telegram native + BarcodeDetector API)
│       │   ├── AddContact.tsx      # Форма добавления контакта (QR/ручной ввод)
│       │   │                       # → тег-пикер, событие, заметка, username
│       │   ├── AddNote.tsx         # Заметка после добавления контакта
│       │   │                       # → MediaRecorder + Whisper transcription + Claude AI summary
│       │   ├── VoiceNote.tsx       # Просмотр расшифровки из бота → прикрепление к контакту
│       │   ├── Contacts.tsx        # Список контактов, фильтры по тегам, поиск, CSV экспорт
│       │   ├── ContactDetail.tsx   # Карточка контакта: заметка, задачи, теги, follow-up
│       │   │                       # Inline тег-пикер с группами: Команда / Трафик / Вертикали
│       │   ├── PublicProfile.tsx   # Публичная страница /u/:username
│       │   │                       # Декодирует d= параметр (base64 JSON) → User object
│       │   ├── MyCard.tsx          # Моя визитка + QR-код
│       │   ├── ShareProfile.tsx    # Поделиться профилем
│       │   ├── EditProfile.tsx     # Редактирование профиля
│       │   ├── Notifications.tsx   # Список уведомлений
│       │   ├── Tasks.tsx           # Все задачи / follow-up
│       │   └── Settings.tsx        # Настройки, экспорт, «Пройти тур заново», О Echo
│       │
│       └── utils/
│           ├── userStore.ts        # loadCurrentUser, saveCurrentUser, getQRValue
│           ├── contactStore.ts     # CRUD контактов в localStorage (w52_contacts)
│           ├── taskStore.ts        # CRUD задач + Redis sync
│           ├── notificationStore.ts
│           ├── serverSync.ts       # ensureRegistered, pushTask, patchTask, deleteTask
│           ├── mockData.ts         # Типы Connection, User; mockContacts = []
│           ├── suggestedContacts.ts # 17 curated iGaming/affiliate контактов для онбординга
│           └── themeStore.ts       # Управление темой (если используется)
│
├── api/                        # Vercel Serverless Functions (Node.js)
│   ├── _lib/
│   │   ├── auth.ts             # verifyInitData (HMAC-SHA256), getInitData
│   │   └── redis.ts            # Redis-клиент singleton (ioredis TCP)
│   │
│   ├── webhook.ts              # POST /api/webhook — Telegram Bot
│   │                           # Команды: /start /help /share /add /note /scan
│   │                           #          /contacts /tasks /me /export /about
│   │                           #          /privacy /terms + алиасы
│   │                           # Смарт-матчинг свободного текста (политика, визитка, etc.)
│   │                           # Голосовые: Whisper → Redis → ссылка на /voice-note
│   │                           # Текст → черновик заметки в Redis
│   │
│   ├── setup-bot.ts            # GET /api/setup-bot?secret= — одноразовая настройка бота:
│   │                           # setMyName, setMyDescription, setMyShortDescription,
│   │                           # setMyCommands, setChatMenuButton
│   ├── register.ts             # POST /api/register — регистрация chat_id
│   ├── tasks.ts                # GET/POST /api/tasks
│   ├── tasks/[id].ts           # PATCH/DELETE /api/tasks/:id
│   ├── cron-reminders.ts       # GET /api/cron-reminders — ежедневный cron 09:00 UTC
│   ├── user-photo.ts           # GET /api/user-photo?user_id= — прокси фото Telegram
│   ├── voice/[id].ts           # GET /api/voice/:id — расшифровка из Redis
│   ├── transcribe.ts           # POST /api/transcribe — аудио → HuggingFace Whisper → текст
│   ├── send-csv.ts             # POST /api/send-csv — CSV файл в Telegram-чат
│   └── anthropic/
│       └── v1/messages.ts      # POST /api/anthropic/v1/messages — прокси Claude API
│
└── public/
    ├── privacy.html            # Политика конфиденциальности (Echo-брендинг, oklch)
    └── terms.html              # Условия использования (Echo-брендинг, oklch)
```

---

## Теги (TAG_GROUPS)

Используются в ContactDetail, AddContact, EditProfile, Contacts — синхронизированы:

| Группа | Теги |
|--------|------|
| Команда | Buying, Платёжки, Разработка, Партнёрская сеть, Прилы, Аккаунты, Трекеры, HR, PR, Дизайн, Конференции |
| Трафик | FB, UAC, PPC, SEO, ASO, TikTok Ads, Influence, Схемы, Email, SMS, УБТ |
| Вертикали | Нутра, Gambling, Betting, Adult, Финансы, Crypto |

---

## API ключи

> ⚠️ Реальные значения — только в Vercel ENV и локальном `.env` (не в Git).

| Переменная | Где взять |
|------------|-----------|
| `TELEGRAM_BOT_TOKEN` | @BotFather → `/newbot` |
| `TELEGRAM_WEBHOOK_SECRET` | Любая случайная строка |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `HUGGINGFACE_TOKEN` | huggingface.co/settings/tokens |
| `REDIS_URL` | Upstash / Redis Labs (TCP) |
| `APP_URL` | https://w52-app.vercel.app |
| `CRON_SECRET` | Автоматически Vercel |

---

## Redis — схема ключей

```
user:<tg_id>                      # hash — профиль (chat_id, username, name, registered_at)
task:<tg_id>:<task_id>            # hash — задача
tasks_due                         # sorted set — дедлайны (score = unix timestamp)
voice:<chat_id>:<file_unique_id>  # string TTL 24ч — расшифровка голосовой заметки
```

---

## Telegram Bot — команды

| Команда | Что делает |
|---------|------------|
| `/start` | Приветствие с легендой кита 52 Hz |
| `/help` | Что умею + список команд |
| `/share` | Ссылка на свою визитку |
| `/add @user заметка` | Записать контакт прямо в чате (работает офлайн) |
| `/note @user текст` | Добавить заметку к контакту |
| `/scan` | Открыть QR-сканер в приложении |
| `/contacts` | Открыть список контактов |
| `/tasks` | Открыть задачи |
| `/me` (+ `/profile`, `/card`) | Моя визитка |
| `/export` (+ `/csv`) | Выгрузка CSV |
| `/about` (+ `/info`) | О Echo |
| `/privacy` (+ `/policy`) | Политика конфиденциальности |
| `/terms` (+ `/tos`) | Условия использования |
| Голосовое сообщение | Whisper → расшифровка → «Сохранить к контакту» |
| Пересланное сообщение / текст | Черновик заметки → «Прикрепить к контакту» |
| Свободный текст (1–3 слова) | Смарт-матчинг: «политика», «контакты», «задачи» и т.д. |

Кнопки в /start:
```
[ Открыть приложение ]   ← единственная, ведущая в mini app
[ Как это работает? ] [ Команды ]  ← callback внутри бота
```

Кнопка «← Назад» есть в «Как это работает?» и «Команды».

---

## Что сделано

### Приложение
- [x] Telegram Mini App (открывается через бота и прямую ссылку)
- [x] Сплэш-экран (сессионный)
- [x] Регистрация (Setup, 2 шага: личные данные + профессиональные)
- [x] 8-слайдовый онбординг (Tour) после регистрации, повтор из Settings
- [x] QR-визитка — base64 JSON в `d=` параметре (работает офлайн)
- [x] QR-сканер — Telegram native + BarcodeDetector API
- [x] Добавление контакта по QR, по @username, вручную
- [x] Тег-пикер с группами Команда / Трафик / Вертикали
- [x] Голосовая заметка (MediaRecorder + Whisper + Claude AI summary)
- [x] Текстовая заметка с Claude AI summary, тегами, сроком follow-up
- [x] Список контактов с фильтрами и поиском
- [x] Карточка контакта (заметка, задачи, follow-up, поделиться)
- [x] Задачи / follow-up (localStorage + Redis sync)
- [x] Публичный профиль `/u/:username` — без авторизации
- [x] Экспорт CSV → файл в Telegram-чат
- [x] Настройки: редактирование профиля, сброс данных, повтор тура
- [x] Echo-брендинг: oklch палитра, Instrument Serif, JetBrains Mono
- [x] WelcomeBanner «Echo Demo» с E. логотипом

### Telegram Bot
- [x] Легенда кита 52 Hz в /start
- [x] Все команды (10 основных + алиасы)
- [x] Смарт-матчинг свободного текста
- [x] Голосовые сообщения → Whisper → расшифровка
- [x] Черновики заметок из текста (Redis 24ч)
- [x] Inline-режим — поделиться визиткой в любом чате
- [x] Кнопка «← Назад» в подменю
- [x] Ежедневный cron — напоминания о просроченных задачах
- [x] Persistent menu button «Открыть Echo» (setChatMenuButton)
- [x] Политика конфиденциальности и Условия — кнопки в /about

### Инфраструктура
- [x] Vercel production (w52-app.vercel.app)
- [x] Redis TCP (Upstash, ioredis singleton)
- [x] HMAC-SHA256 верификация initData на всех API
- [x] Прокси Telegram CDN фото (`/api/user-photo`)
- [x] Прокси Claude API (`/api/anthropic/v1/messages`)
- [x] /api/setup-bot — программное обновление имени/описания/команд бота
- [x] Privacy + Terms HTML (Echo-брендинг)

---

## Известные проблемы / TODO

### Приоритетные
- [ ] **Имя из username** — при добавлении по @username поле «Имя» заполняется username, а не именем из Telegram
- [ ] **Онбординг дважды** — Tour запускается повторно в некоторых сценариях
- [ ] **Публичный профиль** — при открытии `/u/username` без `d=` параметра пишет «нет в Echo» даже если пользователь есть
- [ ] **Старый UI PublicProfile** — стили не обновлены под Echo-брендинг

### Средний приоритет
- [ ] **Засечки в мелких текстах** — часть мелкого UI-текста использует serif, нужен sans
- [ ] **Тег «TG» в Tasks** — кнопка-открывашка Telegram у задач, пользователи принимают за тег
- [ ] **НИШИ в Setup** — лейбл «НИШИ» и теги не синхронизированы с TAG_GROUPS
- [ ] **Воспроизведение аудио** — после записи в AddNote нет кнопки Play
- [ ] **Поиск по заметкам** — в Contacts поиск не ищет по тексту заметок
- [ ] **Дубли задач** — при повторном открытии AddContact создаётся ещё одна задача «Написать X»

---

## Как запустить локально

```bash
git clone https://github.com/yauza7/networking-memory-app.git
cd networking-memory-app
bun install
cp .env.example .env
# Заполни .env
bun run dev
# → http://localhost:5173
```

Для API функций:
```bash
~/.bun/bin/vercel dev
```

> Telegram-функции (initData, фото, бот) работают только внутри Telegram.  
> Локально — приложение работает без авторизации, все данные в localStorage.

---

## Деплой

```bash
# Автодеплой через git push main (Vercel настроен на ветку main)
git push origin main

# Ручной деплой
~/.bun/bin/vercel --prod

# После смены домена — переустановить webhook:
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://w52-app.vercel.app/api/webhook&secret_token=<SECRET>"

# Обновить имя/описание/команды бота:
curl "https://w52-app.vercel.app/api/setup-bot?secret=<WEBHOOK_SECRET>"
```

---

## Архитектурные решения

| Решение | Причина |
|---------|---------|
| Все контакты/задачи в `localStorage` | Нет пользовательской БД, данные приватны |
| Redis только для сервера | chat_id регистрации, задачи cron, голосовые (24ч TTL) |
| HuggingFace Whisper | Транскрипция голоса бесплатно, `whisper-large-v2` |
| Прокси Claude API на сервере | Ключ не попадает в браузер |
| QR с `d=<base64 JSON>` | Профиль передаётся без сервера — работает офлайн |
| Vercel Serverless + Cron | Нет постоянного сервера, бесплатный tier |
| oklch цвета | Современное цветовое пространство, поддержка Safari 15.4+ |

---

*Последнее обновление: май 2026*
