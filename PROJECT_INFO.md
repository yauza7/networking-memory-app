# Echo — Networking Memory App

> Telegram Mini App для нетворкинга на конференциях.
> *Every signal finds its receiver.*

---

## Путь к проекту на Mac
```
/Users/vasilisapestova/Downloads/Networking Memory App (Copy)
```

## Ссылки
- **Vercel (продакшн):** https://w52-app.vercel.app
- **GitHub:** https://github.com/yauza7/networking-memory-app
- **Telegram бот:** @w52_echo_bot — токен хранится в Vercel Dashboard → Settings → Environment Variables (`TELEGRAM_BOT_TOKEN`)

## Переменные окружения
Файл `.env` — только для локального запуска (не в Git).
Для продакшна: Vercel Dashboard → Settings → Environment Variables.

```
TELEGRAM_BOT_TOKEN=         # Токен бота от @BotFather
TELEGRAM_WEBHOOK_SECRET=    # Секрет для верификации webhook
ANTHROPIC_API_KEY=          # Claude AI (https://console.anthropic.com/)
HUGGINGFACE_TOKEN=          # Whisper fallback (https://huggingface.co/)
GROQ_API_KEY=               # Groq — основной AI (быстрый, бесплатный)
REDIS_URL=                  # Redis для хранения данных
APP_URL=                    # https://w52-app.vercel.app
CRON_SECRET=                # Автоматически ставит Vercel
```

## Команды
```bash
bun run dev          # Локальный запуск
bun run build        # Сборка
bunx vercel --prod   # Деплой на Vercel
```

---

## Что сделано

### Экраны (`src/app/screens/`)
| Экран | Маршрут | Описание |
|---|---|---|
| SplashScreen | (при старте) | Заставка |
| Setup | /setup | Первичная регистрация |
| Tour | /tour | Онбординг-тур |
| Dashboard | / | Главная: контакты, задачи, AI-подсказки |
| Contacts | /contacts | Список контактов |
| ContactDetail | /contact/:id | Карточка + AI сводка + черновик сообщения |
| MyCard | /my-card | Профиль + QR-код |
| EditProfile | /edit-profile | Редактирование профиля |
| AddContact | /add-contact | Добавление (QR / бот / вручную) |
| AddNote | /add-note | Заметка к контакту (текст + голос) |
| VoiceNote | /voice-note | Голосовая заметка из бота |
| Scanner | /scan | QR-сканер |
| Tasks | /tasks | Follow-up задачи |
| Notifications | /notifications | Уведомления |
| Settings | /settings | Тема, CSV импорт/экспорт |
| SharedPreview | /c/:token | Просмотр расшаренного контакта |
| PublicProfile | /u/:username | Публичный профиль |

### API (`api/`)
| Файл | Описание |
|---|---|
| webhook.ts | Бот: /start /help /tips /add /share, голосовые, inline, snooze |
| cron-reminders.ts | Крон 9:00 UTC — напоминания о follow-up + кнопки snooze |
| contacts.ts | CRUD контактов (Redis, delta-sync) |
| tasks.ts | CRUD задач (Redis) |
| profile.ts | Публичные профили пользователей |
| share.ts | Создание / клейм share-ссылок |
| register.ts | Регистрация chat_id |
| transcribe.ts | Транскрипция голосовых (Groq Whisper) |
| anthropic/ | Прокси к Anthropic / Groq API |
| user-photo.ts | Прокси фото из Telegram |
| send-csv.ts | Отправка CSV пользователю |

### Ключевые функции
- QR-визитки: сканирование, передача профиля в base64 в URL
- AI сводка заметки — Groq llama-3.3-70b, дополняет существующую
- AI черновик follow-up сообщения — Anthropic/Groq
- Голосовые заметки — Whisper расшифровка прямо из бота
- Outbox — офлайн-очередь (контакты + задачи), дренируется при появлении сети
- Delta-sync контактов и задач через Redis
- Cron-напоминания в 9:00 UTC + snooze на 1 день / 7 дней
- Светлая / тёмная тема (CSS custom properties)
- CSV импорт/экспорт
- seedEchoContact — @pes2va (CEO Echo) автоматически в контактах у всех
- Inline sharing через switchInlineQuery → web_app кнопка в боте

---

## Известные баги

1. **Шаринг профиля открывается в браузере** — `t.me/share/url?url=...` открывает сайт в браузере, не как Mini App. Нужно либо убрать текстовую ссылку полностью, либо сделать deep link через бот.

2. **PublicProfile показывает "Алексея Смирнова"** — `/u/username` в браузере без Telegram контекста рендерит `defaultUser` из mockData вместо реального профиля по username. `loadCurrentUser()` читает localStorage, а не параметр маршрута.

3. **Нет кнопки «Назад» / нижней панели после сохранения контакта** — после перехода с публичного маршрута `/u/username` на `/contact/:id` навигация не отображается (публичные маршруты рендерятся без AppShell).

---

## Структура папок

```
/
├── api/                        # Vercel Serverless Functions
│   ├── _lib/
│   │   ├── auth.ts             # Проверка Telegram initData
│   │   ├── redis.ts            # Redis клиент
│   │   └── telegram.ts         # Telegram API хелпер
│   ├── anthropic/
│   ├── voice/
│   ├── contacts.ts
│   ├── cron-reminders.ts
│   ├── profile.ts
│   ├── register.ts
│   ├── share.ts
│   ├── tasks.ts
│   ├── transcribe.ts
│   ├── user-photo.ts
│   ├── send-csv.ts
│   └── webhook.ts
│
├── public/
│   ├── privacy.html
│   └── terms.html
│
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── brand/
│   │   │   │   └── Brand.tsx   # Design system: Avatar, Hero, IvoryBtn...
│   │   │   ├── ui/             # shadcn/ui компоненты
│   │   │   ├── Navigation.tsx  # Нижняя панель
│   │   │   └── ErrorBoundary.tsx
│   │   ├── screens/            # (см. таблицу выше)
│   │   ├── utils/
│   │   │   ├── contactStore.ts # localStorage + server sync
│   │   │   ├── taskStore.ts    # localStorage + server sync
│   │   │   ├── outboxStore.ts  # Offline outbox
│   │   │   ├── serverSync.ts   # API клиент
│   │   │   ├── profileApi.ts   # Публичные профили
│   │   │   ├── shareApi.ts     # Share-links
│   │   │   ├── userStore.ts    # Профиль текущего пользователя
│   │   │   └── mockData.ts     # Типы + defaultUser
│   │   └── App.tsx             # Роутинг, инициализация, sync
│   ├── styles/
│   │   ├── globals.css
│   │   └── theme.css           # CSS переменные, светлая/тёмная тема
│   └── main.tsx
│
├── .env                        # Локальные переменные (не в Git)
├── .env.example                # Шаблон
├── vercel.json                 # Config + cron
├── vite.config.ts
└── package.json
```
