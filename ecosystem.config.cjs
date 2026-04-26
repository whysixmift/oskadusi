// ============================================================================
// PM2 Ecosystem Configuration — OSKADUSI
// Hack Club Nest Deployment
//
// Usage:
//   pm2 start ecosystem.config.cjs           # start production
//   pm2 start ecosystem.config.cjs --env dev # start development
//   pm2 stop oskadusi                        # stop
//   pm2 restart oskadusi                     # restart
//   pm2 logs oskadusi                        # view logs
//   pm2 save                                 # persist across reboots
//   pm2 startup                              # generate startup script
// ============================================================================

module.exports = {
  apps: [
    {
      // ── App Identity ────────────────────────────────────────────
      name: "oskadusi",
      script: "./backend/dist/index.js",
      cwd: "./",

      // ── Runtime ─────────────────────────────────────────────────
      interpreter: "node",
      node_args: "--max-old-space-size=256",

      // ── Process Management ───────────────────────────────────────
      instances: 1,           // single instance (Nest is a shared server)
      exec_mode: "fork",      // fork mode for single instance
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 3000,    // 3s delay between restarts

      // ── Watching (disabled in production) ───────────────────────
      watch: false,
      ignore_watch: ["node_modules", "backend/node_modules", "dist", "backend/data", "*.log"],

      // ── Logging ─────────────────────────────────────────────────
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      max_size: "10M",
      retain: 7,

      // ── Production Environment ───────────────────────────────────
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },

      // ── Development Environment ──────────────────────────────────
      env_dev: {
        NODE_ENV: "development",
        PORT: 3001,
      },

      // ── Kill Signal ─────────────────────────────────────────────
      kill_timeout: 5000,
      listen_timeout: 8000,
      shutdown_with_message: true,
    },
  ],
};
