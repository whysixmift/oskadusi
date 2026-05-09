import { getDb } from "../db";

type LogLevel = "info" | "warn" | "error";

export function writeSystemLog(
  level: LogLevel,
  source: string,
  message: string,
  metadata?: unknown,
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO system_logs (level, source, message, metadata)
     VALUES (?, ?, ?, ?)`,
  ).run(
    level,
    source,
    message,
    metadata === undefined ? null : JSON.stringify(metadata),
  );
}
