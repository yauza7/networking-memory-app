# Netcard — Дополнительные улучшения

## ✅ Уже реализовано

### Главный экран (Dashboard)
- **Follow-up alerts** — яркие напоминания о контактах, которым нужно написать
- **Quick actions** — быстрый доступ к сканированию и QR-коду
- **Статистика** — контакты, активность за неделю, активные связи
- **Недавние контакты** с AI summaries
- **QR-модалка** — быстрый показ своего QR без перехода на другой экран

### Контакты
- **Фильтры по категориям** — Платёжки, Партнёрки, Арбитраж, Legal, AI/Tech
- **Фильтры по событиям** — MAC 2026, AWA, TES
- **Follow-up filter** — отдельная категория "нужно написать"
- **Поиск** по имени, компании, тегам
- **Активные фильтры** с возможностью быстрого удаления

### Добавление заметок
- **Голосовая запись** — с таймером и визуальной индикацией
- **Текстовые заметки** — textarea с подсказками
- **AI обработка** — показывается процесс + результат (summary + теги)
- **Анимированный flow** — от записи до сохранения

### UX
- **Скрытие навигации** на полноэкранных режимах (онбординг, добавление заметки)
- **CTA кнопки** — четкие призывы к действию
- **Цветовая индикация** — follow-ups оранжевые, AI фиолетовый, success зеленый

---

## 🚀 Следующие улучшения (приоритет)

### 1. Semantic Search (Семантический поиск)
**Проблема:** Обычный поиск не понимает смысл — нужно искать точные слова.

**Решение:**
- AI-powered поиск с пониманием контекста
- Примеры запросов:
  - "кто занимается крипто-пэйментами" → находит людей с Payment + Crypto
  - "с кем я говорил про gambling" → ищет по заметкам и тегам
  - "партнёры для LATAM" → комбинирует LATAM + Affiliate/CPA

**Реализация:**
```typescript
interface SearchResult {
  contact: Connection;
  relevance: number;
  matchedIn: 'note' | 'tags' | 'role' | 'summary';
  excerpt: string;
}
```

**UI:**
- Отдельная вкладка "Умный поиск" в экране контактов
- Real-time suggestions при вводе
- Результаты с highlighting релевантных частей

---

### 2. Decay Detection (Мёртвые связи)
**Проблема:** Забываешь с кем давно не общался, а контакт важный.

**Решение:**
- AI анализирует важность контакта (по тегам, заметкам, частоте упоминаний)
- Напоминания: "Не общались с [Имя] уже 30 дней. Он занимается [важная тема]"
- Категории:
  - 🔥 Hot (общались недавно)
  - 🟡 Warm (2-4 недели)
  - 🔵 Cold (месяц+)
  - ❄️ Frozen (3+ месяца, нужно реанимировать)

**UI:**
- Виджет на Dashboard "Связи остывают"
- Фильтр в контактах по decay status
- One-tap follow-up с AI-генерацией персонализированного сообщения

---

### 3. Bulk Actions (Массовые действия)
**Проблема:** После конференции 20+ контактов — нужно всем написать follow-up.

**Решение:**
- Multi-select режим в списке контактов
- Действия:
  - Отметить для follow-up
  - Добавить общий тег
  - Запланировать напоминание
  - Экспортировать в CSV

**UI:**
- Checkbox mode при долгом тапе на контакт
- Bottom sheet с действиями
- Прогресс-бар при массовых операциях

---

### 4. Timeline View (Временная шкала)
**Проблема:** Хочется видеть хронологию — когда с кем встретился.

**Решение:**
- Календарный вид контактов
- Группировка по дням: "Вторник, 13 мая — 5 контактов"
- Drag-to-scroll горизонтальная timeline

**UI:**
```
[Вчера] [Сегодня] [13 мая] [12 мая] [11 мая]
    ↓       ↓         ↓        ↓        ↓
   3       1         5        2        1
```

При клике на день — список контактов этого дня.

---

### 5. AI Follow-up Generator v2
**Проблема:** Текущий follow-up слишком generic.

**Улучшения:**
- Анализ заметок для персонализации
- Учёт времени: "Привет! Прошла неделя с MAC..."
- Варианты тона: 
  - 🤝 Деловой
  - 😊 Дружеский
  - ⚡ Короткий (1 предложение)
  - 📝 Подробный (с напоминанием о договорённостях)

**UI:**
- Swipe между вариантами
- Inline editing перед отправкой
- История отправленных follow-ups

---

### 6. Smart Notifications (Умные уведомления)
**Проблема:** Забываешь открыть приложение и проверить follow-ups.

**Решение:**
- Telegram bot уведомления:
  - "⏰ Сегодня нужно написать 3 людям"
  - "🔥 Алексей из MAC ответил на follow-up — добавь заметку"
  - "📊 За эту неделю +12 контактов — не забудь добавить заметки"

**Triggers:**
- Daily summary (утром)
- 2 дня после встречи → напоминание о заметке
- 5 дней без follow-up → push
- Decay alert (30 дней без контакта)

---

### 7. Relationship Graph (Граф связей)
**Проблема:** Не видно общих связей и clustering.

**Решение:**
- Визуализация сети контактов
- Показывать:
  - Кто с кем был на одной конференции
  - Общие теги (кластеры по интересам)
  - Кто кого может представить

**UI:**
- Интерактивный граф с nodes и edges
- Zoom in/out
- Tap на node → переход к контакту
- "Кто может познакомить меня с [имя]?"

---

### 8. Export & Integrations
**Проблема:** Данные заперты в приложении.

**Решение:**
- Export в CSV/Excel
- Notion integration (синхронизация контактов)
- Telegram Saved Messages (автоматический backup заметок)
- API для подключения к CRM

---

### 9. Team Mode (Командный режим)
**Проблема:** Агентства ездят на конференции командой — нужно видеть общую базу.

**Решение:**
- Shared workspace для команды
- Кто с кем познакомился
- Collaborative notes (несколько человек добавляют заметки к одному контакту)
- "Иван уже знаком с этим человеком — спроси у него контекст"

**Pricing:**
- Team plan: $15/user/месяц
- Shared contacts pool
- Activity feed команды

---

### 10. Conference Mode Pro
**Проблема:** На конференции хочется видеть real-time активность.

**Решение:**
- Live event dashboard:
  - Сколько людей уже используют Netcard на этой конференции
  - "Trending topics" — какие темы обсуждаются (из AI summaries)
  - Leaderboard (кто больше всех контактов собрал)
  - Рекомендации: "Вы оба интересуетесь AI — познакомьтесь!"

**Gamification:**
- Badges за активность
- "Networker of the Event"
- Challenges: "Собери 20 контактов за день"

---

## 🎨 UI/UX Полировка

### Dark Mode Improvements
- Gradient colors в dark mode смотрятся лучше
- Больше contrast для accessibility

### Animations
- Micro-interactions на кнопках
- Smooth transitions между экранами
- Haptic feedback при важных действиях

### Shortcuts
- Swipe right на контакте → Telegram
- Swipe left → "Добавить заметку"
- Long press → Quick actions menu

### Offline Mode
- Queue для действий offline
- Sync когда появляется интернет
- Индикатор "Offline / Syncing"

---

## 📊 Аналитика (для пользователя)

### Personal Insights
- "Вы познакомились с 45 людьми за месяц"
- "Самые популярные теги: iGaming, Nutra, LATAM"
- "Follow-up rate: 60% (лучше чем у 80% пользователей)"
- "Ваша сеть выросла на 150% за квартал"

### ROI Tracking
- "Из 30 контактов → 5 встреч → 2 сделки"
- Конверсия контакт → активное общение
- Lifetime value контакта

---

## 🔐 Privacy & Security

### Data Control
- Export всех данных одной кнопкой
- Delete account with full data removal
- Encryption заметок (end-to-end)
- Опция: не показывать мою визитку в public event leaderboards

---

## 💰 Monetization Ideas

### Premium Features
- Unlimited contacts (free = 50)
- AI summaries (free = 10/month)
- Semantic search
- Decay detection
- Team mode
- Export to CRM
- Priority support

### Event Partnerships
- Организаторы конференций платят за branded experience
- "Powered by Netcard" на сайте события
- Custom tags для ивента
- Post-event analytics для организаторов

### Affiliate Program
- Referral bonus: месяц Pro бесплатно
- Агентства приводят команды → комиссия

---

## 🚢 Roadmap Priority

**v1 (MVP)** ✅
- QR exchange
- Basic notes
- Contact list
- Simple follow-up

**v2 (Current)**
- Dashboard with insights
- Filters & categories
- Voice notes with AI
- Follow-up alerts

**v3 (Next 2 months)**
- Semantic search
- Decay detection
- Bulk actions
- Timeline view
- Smart notifications

**v4 (Scale)**
- Team mode
- Integrations (Notion, CRM)
- Relationship graph
- Conference mode pro

---

## 💡 Crazy Ideas (может не нужно, но прикольно)

### AI Avatar Chat
"Расскажи мне про всех, кто занимается пэйментами" → AI суммирует все заметки и даёт ответ в chat-формате.

### Voice Search
"Hey Netcard, who did I meet yesterday?" → голосовой интерфейс для поиска.

### AR Business Cards
Наводишь камеру на человека → всплывает его визитка и последняя заметка о нём (если был сохранён).

### Auto-tag from LinkedIn
При добавлении контакта → AI парсит его LinkedIn и автоматически добавляет релевантные теги.

### "Memory Lane"
Раз в месяц — recap в формате stories: "Год назад ты познакомился с Алексеем. Вот что изменилось с тех пор."

---

## Feedback Loop

После каждого релиза:
1. User interviews с 10-15 active users
2. Heatmaps (какие экраны используют чаще всего)
3. Drop-off analysis (где юзеры уходят)
4. NPS survey раз в квартал

---

**Главный принцип:** Каждая фича должна экономить время пользователя или увеличивать его networking ROI. Если не делает ни того, ни другого — не строим.
