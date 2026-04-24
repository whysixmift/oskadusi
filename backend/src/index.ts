import "dotenv/config";
import express from "express";
import path from "path";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import apiRouter from "./routes";
import { runMigrations, seedAdmin, seedSamplePosts } from "./db/schema";
import { getDb } from "./db";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const NODE_ENV = process.env.NODE_ENV || "development";

// ─── Middleware ───────────────────────────────────────────────
app.use(corsMiddleware);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── API Routes ───────────────────────────────────────────────
app.use("/api", apiRouter);

// ─── Serve Frontend (Production) ─────────────────────────────
if (NODE_ENV === "production") {
  const frontendDist = path.join(__dirname, "../../dist");
  app.use(express.static(frontendDist));

  // SPA fallback - all non-API routes serve the frontend
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// ─── Error Handlers ──────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Graceful Shutdown ────────────────────────────────────────
function shutdown(signal: string): void {
  console.log(
    `\n[SERVER] ${signal} received — closing database and exiting...`,
  );
  try {
    const db = getDb();
    // Checkpoint WAL so all data is flushed to the main .db file
    db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    db.close();
    console.log("[SERVER] Database closed cleanly.");
  } catch (err) {
    console.error("[SERVER] Error closing database:", err);
  }
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ─── Database Init ────────────────────────────────────────────
function initDatabase(): void {
  try {
    runMigrations();
    seedAdmin();
    if (NODE_ENV !== "production") {
      seedSamplePosts();
    }
  } catch (err) {
    console.error("[DB] Failed to initialize database:", err);
    process.exit(1);
  }
}

// ─── Start Server ─────────────────────────────────────────────
initDatabase();

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║       OSKADUSI Backend Server        ║
╠══════════════════════════════════════╣
║  Status   : Running                  ║
║  Port     : ${PORT.toString().padEnd(26)}║
║  Env      : ${NODE_ENV.padEnd(26)}║
║  API      : http://localhost:${PORT}/api  ║
╚══════════════════════════════════════╝
  `);
});

export default app;
