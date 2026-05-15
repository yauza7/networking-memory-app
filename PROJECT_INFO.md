# W·52 — Networking Memory App

> Telegram Mini App для нетворкинга на конференциях.  
> 52 недели в году — поддерживай связи весь год.

---

## Ссылки

| Что | Ссылка |
|-----|--------|
| Мини-апп (production) | https://w52-app.vercel.app |
| Telegram бот | [@Whale52hz_bot](https://t.me/Whale52hz_bot) |
| Открыть мини-апп в Telegram | https://t.me/Whale52hz_bot/w52 |
| GitHub репозиторий | https://github.com/yauza7/networking-memory-app |
| Vercel dashboard | https://vercel.com/surevshare-9022s-projects/w52-app |

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
├── index.html                  # Точка входа HTML, viewport meta, Telegram WebApp SDK
├── vite.config.ts              # Конфиг Vite
├── vercel.json                 # Vercel: rewrites, crons, функции maxDuration
├── package.json                # Зависимости
├── .env                        # ⛔ НЕ в Git — реальные ключи
├── .env.example                # ✅ В Git — шаблон без значений
├── .gitignore
│
├── src/
│   ├── main.tsx                # React root, монтирование #root
│   ├── styles/                 # Глобальные CSS (Tailwind, glass-card, ios-tag)
│   └── app/
│       ├── App.tsx             # Роутер, сплэш, Setup-гейт, Telegram WebApp init
│       ├── components/
│       │   ├── Navigation.tsx  # Нижняя навигация (скрыта на фокусных экранах)
│       │   ├── ErrorBoundary.tsx # Глобальный обработчик ошибок React
│       │   ├── VisualCard.tsx  # Компонент визуальной карточки контакта
│       │   └── ui/             # Shadcn/Radix UI компоненты (не используются активно)
│       │
│       ├── screens/            # Все экраны приложения
│       │   ├── SplashScreen.tsx    # Заставка при первом открытии сессии
│       │   ├── Setup.tsx           # Регистрация (имя, должность, username, фото)
│       │   ├── Dashboard.tsx       # Главный экран — статистика, follow-up задачи
│       │   ├── Scanner.tsx         # QR-сканер (Telegram native + BarcodeDetector)
│       │   ├── AddContact.tsx      # Форма добавления контакта (QR/ручной ввод)
│       │   │                       # → тег-пикер, событие, заметка
│       │   ├── AddNote.tsx         # Экран заметки после добавления контакта
│       │   │                       # → MediaRecorder + авто-транскрипция + AI summary
│       │   ├── VoiceNote.tsx       # Просмотр/редактирование расшифровки из бота
│       │   │                       # → прикрепление к контакту
│       │   ├── Contacts.tsx        # Список контактов, фильтры, поиск, CSV→бот
│       │   ├── ContactDetail.tsx   # Карточка контакта, задачи, заметки, follow-up
│       │   ├── PublicProfile.tsx   # Публичная страница /u/:username (без авторизации)
│       │   ├── MyCard.tsx          # Моя визитка + QR-код
│       │   ├── ShareProfile.tsx    # Поделиться профилем
│       │   ├── EditProfile.tsx     # Редактирование профиля
│       │   ├── Notifications.tsx   # Список уведомлений
│       │   ├── Tasks.tsx           # Все задачи / follow-up
│       │   ├── Settings.tsx        # Настройки, экспорт, О приложении, удаление данных
│       │   └── Onboarding.tsx      # Онбординг (tips)
│       │
│       └── utils/
│           ├── userStore.ts        # loadCurrentUser, saveCurrentUser, getQRValue
│           │                       # → Telegram initData + localStorage w52_profile
│           ├── contactStore.ts     # CRUD контактов в localStorage w52_contacts
│           │                       # → addStoredContact, removeStoredContact, updateStoredContact
│           ├── taskStore.ts        # CRUD задач + синхронизация с сервером
│           ├── notificationStore.ts# Уведомления в localStorage
│           ├── serverSync.ts       # ensureRegistered, pushTask, patchTask, deleteTask
│           │                       # → best-effort POST к API (не блокирует UI)
│           ├── mockData.ts         # Типы Connection, User; mockContacts = [] (пусто)
│           └── telegramBot.ts      # Утилиты бота (не используется на клиенте)
│
├── api/                        # Vercel Serverless Functions (Node.js)
│   ├── _lib/
│   │   ├── auth.ts             # verifyInitData (HMAC-SHA256), getInitData
│   │   └── redis.ts            # Redis-клиент singleton (ioredis TCP)
│   │
│   ├── webhook.ts              # POST /api/webhook — Telegram Bot
│   │                           # Команды: /start /help /share /add /scan /contacts /tasks /profile
│   │                           # Голосовые: Whisper → Redis → ссылка на /voice-note
│   │                           # Текст → черновик заметки в Redis
│   │
│   ├── register.ts             # POST /api/register — регистрация chat_id для cron
│   ├── tasks.ts                # GET/POST /api/tasks — список и создание задач
│   ├── tasks/[id].ts           # PATCH/DELETE /api/tasks/:id
│   ├── cron-reminders.ts       # GET /api/cron-reminders — ежедневный cron 09:00 UTC
│   │                           # → достаёт просроченные задачи из Redis ZSET, шлёт в бот
│   ├── user-photo.ts           # GET /api/user-photo?user_id= — прокси фото из Telegram
│   ├── voice/[id].ts           # GET /api/voice/:id — получить расшифровку из Redis
│   ├── transcribe.ts           # POST /api/transcribe — аудио → Whisper → текст
│   │                           # Используется AddNote.tsx для записи из мини-апп
│   ├── send-csv.ts             # POST /api/send-csv — отправить CSV файл в Telegram-чат
│   └── anthropic/
│       └── v1/messages.ts      # POST /api/anthropic/v1/messages — прокси Claude API
│
└── public/
    ├── privacy.html            # Политика конфиденциальности
    └── terms.html              # Условия использования
```

---

## API ключи — где хранятся

> ⚠️ Реальные значения ключей **нигде в коде не хранятся**.  
> Шаблон — `.env.example`. Реальный файл — `.env` (не в Git).

| Переменная | Где взять | Где хранится |
|------------|-----------|--------------|
| `TELEGRAM_BOT_TOKEN` | @BotFather → `/newbot` | Vercel ENV + локально в `.env` |
| `TELEGRAM_WEBHOOK_SECRET` | Любая случайная строка | Vercel ENV + `.env` |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Vercel ENV + `.env` |
| `HUGGINGFACE_TOKEN` | huggingface.co/settings/tokens | Vercel ENV + `.env` |
| `REDIS_URL` | Redis Labs / Upstash / любой TCP Redis | Vercel ENV + `.env` |
| `APP_URL` | `https://w52-app.vercel.app` | Vercel ENV + `.env` |
| `CRON_SECRET` | Автоматически Vercel | Vercel ENV |

**Добавить/изменить ключ в Vercel:**
```bash
vercel env add КЛЮЧ production
# или через dashboard: vercel.com → Project → Settings → Environment Variables
```

---

## Redis — схема ключей

```
user:<tg_id>                    # hash — профиль пользователя (chat_id, username, name)
task:<tg_id>:<task_id>          # hash — задача
tasks_due                       # sorted set — задачи по дедлайну (score = unix timestamp)
voice:<chat_id>:<file_unique_id># string с TTL 24ч — расшифрованный текст голосовой заметки
```

---

## Что уже сделано

### Основной функционал
- [x] Telegram Mini App (открывается через бота)
- [x] Регистрация/онбординг (Setup экран)
- [x] Сплэш-экран при первом открытии сессии
- [x] QR-визитка — генерация с полным профилем в `d=` параметре
- [x] QR-сканер — Telegram native + BarcodeDetector API
- [x] Добавление контакта через QR → AddContact → AddNote
- [x] Ручное добавление контакта (без QR)
- [x] Тег-пикер при добавлении контакта
- [x] Голосовая заметка через мини-апп (MediaRecorder + авто-транскрипция Whisper)
- [x] Текстовая заметка с AI summary (Claude Sonnet)
- [x] AI создаёт summary, теги и срок follow-up из заметки
- [x] Graceful AI failure — заметка сохраняется даже без AI
- [x] Список контактов с фильтрами (категория, событие, поиск)
- [x] Карточка контакта (фото, заметка, задачи, follow-up)
- [x] Удаление контакта
- [x] Поделиться контактом (через Telegram share)
- [x] Умное follow-up сообщение (адаптируется к незаполненным полям)
- [x] Поделиться своей визиткой из карточки контакта
- [x] Публичный профиль `/u/:username` — работает без регистрации
- [x] Задачи / follow-up напоминания (localStorage + Redis sync)
- [x] Уведомления
- [x] Экспорт контактов в CSV → файл в Telegram-чат (с учётом активного фильтра)
- [x] Настройки: редактирование профиля, сброс данных, О приложении

### Telegram Bot (@Whale52hz_bot)
- [x] `/start` — приветствие с меню
- [x] `/help` — список команд
- [x] `/share` — короткая ссылка на визитку
- [x] `/add @username заметка` — быстро записать контакт через бота
- [x] `/scan` — открыть QR-сканер
- [x] `/contacts`, `/tasks`, `/profile` — навигация
- [x] Голосовые сообщения → Whisper → расшифровка → ссылка «Сохранить к контакту»
- [x] Текстовые сообщения → черновик заметки в Redis → кнопка «Прикрепить к контакту»
- [x] Inline-режим (@bot в любом чате) — поделиться визиткой
- [x] Ежедневный cron (09:00 UTC) — напоминания о просроченных задачах

### Инфраструктура
- [x] Vercel production deploy (https://w52-app.vercel.app)
- [x] Redis TCP (ioredis, singleton)
- [x] HMAC-SHA256 верификация Telegram initData на всех API
- [x] Прокси фото из Telegram (`/api/user-photo`)
- [x] Прокси Claude API (`/api/anthropic/v1/messages`)
- [x] Privacy Policy + Terms of Use (HTML-страницы)

---

## Что ещё не доделано / известные баги

### Средний приоритет
- [ ] **Воспроизведение записанного аудио** — после записи в AddNote нет кнопки Play
- [ ] **Фото при регистрации** — Setup экран не предлагает загрузить фото вручную (только из Telegram)
- [ ] **Поиск по заметкам** — в списке контактов поиск не ищет по тексту заметок
- [ ] **Редактирование заметки** — в ContactDetail нет inline-редактирования, только добавление новых
- [ ] **Импорт контактов** — нет возможности импортировать CSV обратно
- [ ] **Публичный профиль без d=** — если кто-то шарит `/u/username` без QR-данных, профиль пустой (показывает «добавить по username»)

### Мелкие баги
- [ ] **Дата follow-up** — хранится как строка в `followUpDate`, но в UI не отображается явно на Dashboard
- [ ] **Дубли задач** — при переоткрытии AddContact создаётся новая задача «Написать X», если контакт уже есть
- [ ] **Offline-режим** — нет явного сообщения об ошибке если нет сети при транскрипции
- [ ] **Длинные имена** — в Navigation и некоторых карточках длинные имена не обрезаются через ellipsis

### Нереализовано (задумано, но не сделано)
- [ ] **Поиск по Telegram username** в базе W52 (пока только локальный поиск)
- [ ] **Push-уведомления** через Telegram bot (cron есть, но уведомления только в чате бота)
- [ ] **Аналитика** — нет дашборда «сколько встреч на какой конференции»

---

## Как запустить локально

### 1. Клонировать репозиторий
```bash
git clone https://github.com/yauza7/networking-memory-app.git
cd networking-memory-app
```

### 2. Установить зависимости
```bash
# Bun (рекомендуется — используется на проекте)
bun install

# или npm
npm install
```

### 3. Создать .env
```bash
cp .env.example .env
# Заполни реальные значения в .env
```

Минимум для запуска фронтенда без бота:
```
APP_URL=http://localhost:5173
```

### 4. Запустить dev-сервер
```bash
bun run dev
# или
npm run dev
```

Открыть: http://localhost:5173

> **Важно:** Telegram-функции (initData, фото, бот) работают только внутри Telegram.  
> При локальном открытии в браузере — приложение работает без авторизации,  
> фото и push-функции недоступны.

### 5. Запустить API локально (опционально)
```bash
# Vercel CLI нужен для локального запуска serverless функций
vercel dev
```

---

## Как задеплоить

### Автодеплой через Git
Vercel настроен на автодеплой из ветки `main`:
```bash
git add .
git commit -m "описание изменений"
git push origin main
# Vercel задеплоит автоматически через ~30 сек
```

### Ручной деплой
```bash
~/.bun/bin/vercel --prod
# или если vercel в PATH:
vercel --prod
```

### После деплоя — переустановить webhook бота
Если изменился домен (обычно не нужно — домен `w52-app.vercel.app` постоянный):
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://w52-app.vercel.app/api/webhook&secret_token=<WEBHOOK_SECRET>"
```

---

## Архитектурные решения

| Решение | Причина |
|---------|---------|
| Все контакты/задачи в `localStorage` | Нет пользовательской БД, всё приватно на устройстве |
| Redis только для сервера | Хранение: регистрации chat_id, задачи для cron, голосовые заметки (24ч TTL) |
| HuggingFace Whisper (бесплатно) | Транскрипция голоса без затрат, модель `whisper-large-v2` |
| Прокси Claude API на сервере | Ключ не попадает в браузер |
| Прокси фото Telegram на сервере | CDN-ссылки из initData протухают, прокси отдаёт свежее фото |
| QR с `d=<base64>` | Полный профиль передаётся без сервера — работает офлайн |
| Vercel Serverless + Cron | Нет постоянного сервера, оплата по запросам, бесплатный tier |

---

*Последнее обновление: май 2025*
