import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { BlogPost } from "../types";
import { writeSystemLog } from "../utils/logging";
import { calculateReadTime, generateUniqueSlug } from "../utils/posts";
import { getSystemMetrics } from "../utils/systemMetrics";
import {
  isAuthorizedTelegramRequester,
  sendTelegramMessage,
  TelegramUpdate,
} from "../utils/telegram";

const router = Router();

function extractMessage(update: TelegramUpdate) {
  return update.message || update.edited_message || update.callback_query?.message;
}

async function handleStatusCommand(chatId: string | number | undefined): Promise<string> {
  const metrics = await getSystemMetrics();
  const ram = metrics.ram.usagePercent;
  const cpu = metrics.cpu.usagePercent;
  const disk = metrics.disk.usagePercent;
  const text = `Status OSKADUSI\nCPU: ${cpu}%\nRAM: ${ram}%\nDisk: ${disk}%`;
  await sendTelegramMessage(chatId, text);
  return text;
}

async function handlePostCommand(
  chatId: string | number | undefined,
  text: string,
): Promise<BlogPost> {
  const [titleLine, ...contentLines] = text.replace(/^\/post(@\w+)?\s*/i, "").split("\n");
  const title = titleLine?.trim();
  const content = contentLines.join("\n").trim();

  if (!title || !content) {
    throw new Error("Use /post Title on the first line, then content on following lines.");
  }

  const db = getDb();
  const now = new Date().toISOString();
  const slug = generateUniqueSlug(title);
  const excerpt =
    content.length > 180 ? `${content.slice(0, 177).trim()}...` : content;
  const readTime = calculateReadTime(content);

  const insertBlog = db.prepare(
    `INSERT INTO blog_posts (title, content, author, timestamp)
     VALUES (?, ?, ?, ?)`,
  );
  const insertPost = db.prepare(
    `INSERT INTO posts (slug, title, excerpt, content, category, author, published, published_at, read_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const postId = db.transaction(() => {
    insertBlog.run(title, content, "Telegram Bot", now);
    const result = insertPost.run(
      slug,
      title,
      excerpt,
      content,
      "Telegram",
      "Telegram Bot",
      1,
      now,
      readTime,
    );
    return result.lastInsertRowid;
  })();

  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as BlogPost;
  await sendTelegramMessage(chatId, `Published: ${post.title}`);
  return post;
}

// POST /api/telegram/webhook - Telegram update receiver for bot commands.
router.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  if (!isAuthorizedTelegramRequester(req)) {
    writeSystemLog("warn", "telegram", "Unauthorized Telegram webhook request", {
      ip: req.ip,
    });
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const update = req.body as TelegramUpdate;
  const message = extractMessage(update);
  const text = message?.text?.trim() || "";
  const chatId = message?.chat?.id;

  try {
    if (/^\/status(@\w+)?$/i.test(text)) {
      const reply = await handleStatusCommand(chatId);
      writeSystemLog("info", "telegram", "Handled /status command");
      res.json({ success: true, action: "status", data: { reply } });
      return;
    }

    if (/^\/post(@\w+)?\s+/i.test(text)) {
      const post = await handlePostCommand(chatId, text);
      writeSystemLog("info", "telegram", "Handled /post command", {
        postId: post.id,
      });
      res.json({ success: true, action: "post", data: post });
      return;
    }

    const helpText =
      "Available commands:\n/status\n/post Title\\nPost content";
    await sendTelegramMessage(chatId, helpText);
    res.json({ success: true, action: "help", data: { reply: helpText } });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "Command failed";
    writeSystemLog("error", "telegram", "Telegram command failed", {
      error: messageText,
    });
    await sendTelegramMessage(chatId, messageText);
    res.status(400).json({ success: false, error: messageText });
  }
});

export default router;
