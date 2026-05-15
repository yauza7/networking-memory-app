# W·52 — Networking Memory App

Telegram Mini App для нетворкинга на конференциях. Обмен визитками через QR, заметки о встречах, follow-up задачи, AI-резюме.

**Стек:** React 18 + Vite + TypeScript + Tailwind, deploy на Vercel (включая serverless webhook бота).

## Локальный запуск

```bash
# 1. Установи зависимости
npm install   # или bun install / pnpm install

# 2. Создай .env по образцу .env.example
cp .env.example .env
# Заполни ANTHROPIC_API_KEY (для AI-функций)

# 3. Запусти dev-сервер
npm run dev
```

Приложение поднимется на http://localhost:5173.

## Деплой в продакшн

### 1. Деплой фронтенда + webhook на Vercel

```bash
# Установи Vercel CLI и залогинься
npm i -g vercel
vercel login

# Из корня проекта:
vercel --prod
```

При первом запуске задай environment variables в проекте Vercel:

| Переменная | Описание |
|---|---|
| `ANTHROPIC_API_KEY` | API-ключ Anthropic для AI-функций (без него AI отключён) |
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Случайная строка 32+ символов для верификации webhook |
| `APP_URL` | Публичный URL приложения, например `https://w52-app.vercel.app` |

### 2. Создание Telegram-бота

1. Открой @BotFather → `/newbot`
2. Скопируй токен в `TELEGRAM_BOT_TOKEN`
3. Настрой Mini App:
   - `/newapp` → выбери бота → задай URL `https://<твой-домен>` → загрузите иконку 640×360
4. Включи Inline Mode: `/setinline` → описание
5. Команды: `/setcommands`:
   ```
   start - Запустить W·52
   ```

### 3. Привязка webhook к боту

```bash
# Сгенерируй секрет
SECRET=$(openssl rand -hex 16)
echo "TELEGRAM_WEBHOOK_SECRET=$SECRET"   # положи это в Vercel env

# Зарегистрируй webhook с проверкой подписи
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://<твой-домен>/api/webhook\",\"secret_token\":\"$SECRET\",\"allowed_updates\":[\"message\",\"callback_query\",\"inline_query\"]}"

# Проверь
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

### 4. Privacy / Terms в боте

Telegram требует Privacy URL для публикации Mini App:
1. `/mybots` → выбери бота → Bot Settings → Privacy Policy → `https://<твой-домен>/privacy.html`
2. Terms: `https://<твой-домен>/terms.html`

## Безопасность

- ✅ Webhook проверяет `X-Telegram-Bot-Api-Secret-Token` header (HMAC через секрет)
- ✅ ANTHROPIC_API_KEY проксируется через сервер — не попадает в браузерный бандл
- ✅ Все данные хранятся локально на устройстве пользователя (localStorage)
- ✅ Входные данные из QR-кодов санитизируются перед использованием
- ✅ ErrorBoundary не позволяет крашам показать белый экран

## Структура проекта

```
api/
  webhook.ts            # Vercel serverless function для Telegram бота
src/app/
  App.tsx               # Корневой компонент + роутер
  components/           # UI-компоненты (Navigation, ErrorBoundary, …)
  screens/              # Экраны (Dashboard, Contacts, Scanner, …)
  utils/                # Хранилища localStorage (contactStore, taskStore, …)
public/
  privacy.html          # Политика конфиденциальности (для бота)
  terms.html            # Условия использования
```

## Документы

- [PRIVACY.md](./PRIVACY.md) — политика конфиденциальности
- [TERMS.md](./TERMS.md) — условия использования
- [IMPROVEMENTS.md](./IMPROVEMENTS.md) — roadmap улучшений

## Лицензия

Проприетарное ПО автора. Все права защищены.
