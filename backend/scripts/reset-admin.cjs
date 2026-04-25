require("dotenv").config();

const bcrypt = require("bcryptjs");
const { getDb } = require("../dist/db");

const username = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error("ADMIN_PASSWORD is missing in backend/.env");
  process.exit(1);
}

const db = getDb();
const hash = bcrypt.hashSync(password, 10);

db.prepare(
  `
    INSERT INTO admin_users (username, password)
    VALUES (?, ?)
    ON CONFLICT(username) DO UPDATE SET password = excluded.password
  `,
).run(username, hash);

console.log(`Admin password reset for username: ${username}`);

try {
  db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
  db.close();
} catch (err) {
  console.warn("Admin reset completed, but closing database failed:", err);
}
