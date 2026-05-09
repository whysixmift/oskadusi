import { Request } from "express";

export interface TelegramUser {
  id?: number | string;
}

export interface TelegramMessage {
  text?: string;
  chat?: {
    id?: number | string;
  };
  from?: TelegramUser;
}

export interface TelegramUpdate {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  callback_query?: {
    from?: TelegramUser;
    message?: TelegramMessage;
    data?: string;
  };
}

function normalizeTelegramId(id: unknown): string | null {
  if (typeof id === "number" && Number.isFinite(id)) {
    return String(id);
  }

  if (typeof id === "string" && id.trim() !== "") {
    return id.trim();
  }

  return null;
}

export function getTelegramRequesterId(req: Request): string | null {
  const headerId = req.header("x-telegram-admin-id");
  if (headerId) return normalizeTelegramId(headerId);

  const body = req.body as Record<string, unknown> | TelegramUpdate | undefined;
  if (!body || typeof body !== "object") return null;

  const directBody = body as Record<string, unknown>;
  const directId =
    normalizeTelegramId(directBody.telegram_id) ||
    normalizeTelegramId(directBody.telegramId) ||
    normalizeTelegramId(directBody.adminTelegramId);
  if (directId) return directId;

  const update = body as TelegramUpdate;
  return (
    normalizeTelegramId(update.message?.from?.id) ||
    normalizeTelegramId(update.edited_message?.from?.id) ||
    normalizeTelegramId(update.callback_query?.from?.id)
  );
}

export function isAuthorizedTelegramRequester(req: Request): boolean {
  const adminId = normalizeTelegramId(process.env.TELEGRAM_ADMIN_ID);
  if (!adminId) return false;

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const providedSecret =
      req.header("x-telegram-bot-api-secret-token") ||
      req.header("x-telegram-secret-token");
    if (providedSecret !== secret) return false;
  }

  return getTelegramRequesterId(req) === adminId;
}

export async function sendTelegramMessage(
  chatId: string | number | undefined,
  text: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || chatId === undefined) return;

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    },
  );

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${response.status}`);
  }
}
