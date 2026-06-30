import "server-only";

import { logServerError } from "@/lib/observability/server-log";

type TelegramMessageOptions = {
  parseMode?: "HTML";
  disableWebPagePreview?: boolean;
};

const TELEGRAM_API = "https://api.telegram.org";

function env(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function isTelegramWebsiteNotificationsConfigured() {
  return Boolean(env("TELEGRAM_BOT_TOKEN") && env("TELEGRAM_WEBSITE_CHAT_ID"));
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;",
      })[char] ?? char,
  );
}

export function telegramSafe(value: string | number | null | undefined) {
  return escapeHtml(String(value ?? "-"));
}

export async function sendWebsiteTelegramMessage(
  text: string,
  options: TelegramMessageOptions = {},
) {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chatId = env("TELEGRAM_WEBSITE_CHAT_ID");
  const topicId = env("TELEGRAM_WEBSITE_TOPIC_ID");

  if (!token || !chatId) return { ok: false, skipped: true } as const;

  try {
    const response = await fetch(
      `${TELEGRAM_API}/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_thread_id: topicId ? Number(topicId) : undefined,
          text,
          parse_mode: options.parseMode ?? "HTML",
          disable_web_page_preview: options.disableWebPagePreview ?? true,
        }),
      },
    );

    if (!response.ok) {
      const payload = (await response.text()).slice(0, 500);
      throw new Error(`Telegram send failed: ${response.status} ${payload}`);
    }

    return { ok: true, skipped: false } as const;
  } catch (error) {
    logServerError("telegram_website_notification_failed", error, {
      chatIdConfigured: Boolean(chatId),
      topicIdConfigured: Boolean(topicId),
    });
    return { ok: false, skipped: false } as const;
  }
}
