// Заглушка для Telegram Bot уведомлений.
// Для подключения реального бота:
// 1. Создай бота через @BotFather и получи BOT_TOKEN
// 2. Замени fetch-вызов ниже на реальный: POST https://api.telegram.org/bot{BOT_TOKEN}/sendMessage
// 3. Добавь BOT_TOKEN в .env как VITE_TG_BOT_TOKEN (через прокси на бэкенде для безопасности)

export type NotificationType =
  | "mutual_exchange"   // Взаимный обмен визитками
  | "followup_reminder" // Пора написать контакту
  | "contact_cold";     // Контакт остывает (30+ дней без общения)

interface NotificationPayload {
  type: NotificationType;
  recipientUsername?: string;
  contactName?: string;
  eventName?: string;
  daysSinceContact?: number;
}

export function sendNotification(payload: NotificationPayload): void {
  const message = buildMessage(payload);

  // TODO: заменить на реальный вызов бота
  // fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ chat_id: recipientChatId, text: message, parse_mode: 'HTML' }),
  // })

  console.log(`[TelegramBot] → @${payload.recipientUsername ?? 'unknown'}: ${message}`);
}

function buildMessage(p: NotificationPayload): string {
  switch (p.type) {
    case "mutual_exchange":
      return (
        `🤝 Взаимный обмен!\n\n` +
        `${p.contactName} сохранил твою визитку${p.eventName ? ` на ${p.eventName}` : ""}. ` +
        `Его визитка добавлена в твои контакты.`
      );
    case "followup_reminder":
      return (
        `⏰ Не забудь написать!\n\n` +
        `Ты познакомился с ${p.contactName} ` +
        `${p.eventName ? `на ${p.eventName} ` : ""}2 дня назад, но ещё не написал. ` +
        `Самое время для follow-up!`
      );
    case "contact_cold":
      return (
        `❄️ Связь остывает\n\n` +
        `Ты не общался с ${p.contactName} уже ${p.daysSinceContact} дней. ` +
        `Реанимируй контакт — напиши пару строк!`
      );
  }
}
