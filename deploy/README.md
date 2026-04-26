# OSKADUSI — Deployment Guide
## Hack Club Nest Server

This guide walks you through deploying the OSKADUSI website (React frontend + Express/SQLite backend) on a **Hack Club Nest** server.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [First-Time Setup](#first-time-setup)
4. [Environment Variables](#environment-variables)
5. [Building & Running](#building--running)
6. [Automated Deployment](#automated-deployment)
7. [nginx Configuration](#nginx-configuration)
8. [PM2 Process Management](#pm2-process-management)
9. [Blog Admin Panel](#blog-admin-panel)
10. [Updating the Site](#updating-the-site)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, make sure the following are installed on your Nest server:

```bash
# Check versions
node --version    # Must be v18 or higher
npm --version     # v9+
pm2 --version     # Process manager

# Install PM2 globally if not present
npm install -g pm2
```

If Node.js is not installed or is outdated:
```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

# Install and use Node.js LTS
nvm install --lts
nvm use --lts
```

---

## Project Structure

```
oskadusi/
├── src/                    # React frontend source
│   ├── components/         # Shared UI components
│   ├── sections/           # Page sections (Hero, About, etc.)
│   ├── pages/              # Standalone pages (Blog, Admin)
│   └── lib/api.ts          # Frontend API client
├── backend/                # Express.js backend
│   ├── src/
│   │   ├── db/             # SQLite database + migrations
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/      # Auth, CORS, error handling
│   │   └── index.ts        # Server entry point
│   └── data/               # SQLite database files (auto-created)
├── dist/                   # Built frontend (auto-generated)
├── deploy/
│   ├── README.md           # This file
│   ├── nginx.conf          # nginx reverse proxy config
│   └── deploy.sh           # Automated deployment script
├── ecosystem.config.cjs    # PM2 process configuration
├── .env.example            # Frontend environment template
└── backend/.env.example    # Backend environment template
```

---

## First-Time Setup

### 1. Clone the repository

```bash
# SSH into your Nest server
ssh YOUR_USERNAME@hackclub.app

# Clone into your home directory
cd ~
git clone https://github.com/YOUR_USERNAME/oskadusi.git
cd oskadusi
```

### 2. Set up environment variables

```bash
# Frontend
cp .env.example .env
nano .env
# Set VITE_API_URL=/api  (use /api when nginx proxies everything)

# Backend
cp backend/.env.example backend/.env
nano backend/.env
```

See the [Environment Variables](#environment-variables) section for details on what to fill in.

### 3. Make the deploy script executable

```bash
chmod +x deploy/deploy.sh
```

### 4. Run the initial deployment

```bash
./deploy/deploy.sh
```

This single command will:
- Install all dependencies
- Build the React frontend
- Compile the TypeScript backend
- Run database migrations and seed the admin user
- Start the PM2 process

---

## Environment Variables

### Frontend — `.env`

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `/api` (production) or `http://localhost:3001/api` (dev) |

> **Note:** In production on Nest, set `VITE_API_URL=/api` so the frontend uses a relative path that nginx proxies to the backend.

### Backend — `backend/.env`

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the Express server listens on | `3001` |
| `NODE_ENV` | Runtime environment | `production` |
| `JWT_SECRET` | Secret for signing JWT tokens — **must be long and random** | `a8f5...` (48+ chars) |
| `ADMIN_USERNAME` | Admin panel login username | `admin` |
| `ADMIN_PASSWORD` | Admin panel login password — **change this!** | `MySuperSecret2026!` |
| `FRONTEND_URL` | Frontend URL for CORS whitelist | `https://YOUR_USERNAME.hackclub.app` |
| `DATABASE_PATH` | Path to the SQLite database file | `./data/oskadusi.db` |

#### Generating a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Building & Running

### Manual build (step by step)

```bash
cd ~/oskadusi

# 1. Install frontend dependencies
npm install

# 2. Build the React app
npm run build
# → Output goes to dist/

# 3. Install backend dependencies
cd backend
npm install

# 4. Compile TypeScript backend
npm run build
# → Output goes to backend/dist/

# 5. Run database migrations
node -e "
  require('dotenv').config();
  const { runMigrations, seedAdmin } = require('./dist/db/schema');
  runMigrations();
  seedAdmin();
"

# 6. Start with PM2
cd ..
pm2 start ecosystem.config.cjs
```

### Development mode (local machine)

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env  # edit as needed
npm install
npm run dev           # tsx watch, hot-reload on port 3001

# Terminal 2 — Frontend
cd ..                 # back to oskadusi/
cp .env.example .env  # VITE_API_URL=http://localhost:3001/api
npm install
npm run dev           # Vite dev server on port 5173 (proxies /api to 3001)
```

Then open `http://localhost:5173` in your browser.

---

## Automated Deployment

After first-time setup, every future deploy is one command:

```bash
cd ~/oskadusi
./deploy/deploy.sh
```

The script handles everything automatically:

1. **Git pull** — pulls the latest code (stashes any local changes)
2. **Env check** — creates `.env` files from examples if missing
3. **Frontend build** — `npm ci && npm run build`
4. **Backend build** — `npm install && tsc`
5. **DB migrations** — runs any pending schema changes
6. **PM2 restart** — restarts the process with the new build
7. **Health check** — verifies the server is responding at `/api/health`

---

## nginx Configuration

Hack Club Nest uses nginx as a reverse proxy. The provided config template at `deploy/nginx.conf` routes:

- `/api/*` → Express backend (port 3001)
- `/*` → Express backend → serves built React SPA

### Setting up nginx on Nest:

```bash
# Copy the config template
sudo cp deploy/nginx.conf /etc/nginx/sites-available/oskadusi

# Edit it — replace YOUR_USERNAME with your actual Nest username
sudo nano /etc/nginx/sites-available/oskadusi

# Enable the site
sudo ln -s /etc/nginx/sites-available/oskadusi /etc/nginx/sites-enabled/oskadusi

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

> **Hack Club Nest note:** If Nest uses Caddy instead of nginx, you may not need this config — Caddy handles SSL and proxying automatically. Check the [Nest documentation](https://hackclub.com/nest/) for the current setup.

### Minimal Caddyfile (if Nest uses Caddy):

```
YOUR_USERNAME.hackclub.app {
    reverse_proxy localhost:3001
}
```

---

## PM2 Process Management

PM2 keeps your Node.js server running 24/7, even after SSH disconnects or server reboots.

### Common commands:

```bash
# View running processes
pm2 list

# View live logs
pm2 logs oskadusi

# View last 100 log lines
pm2 logs oskadusi --lines 100

# Restart the app
pm2 restart oskadusi

# Stop the app
pm2 stop oskadusi

# Delete the process (you'll need to start it again)
pm2 delete oskadusi

# Monitor CPU/RAM usage
pm2 monit
```

### Survive server reboots:

```bash
# Save the current process list
pm2 save

# Generate a startup script (run this once)
pm2 startup
# → Copy and run the command it outputs
```

After running `pm2 startup` and `pm2 save`, PM2 will automatically restart your app when the Nest server reboots.

---

## Blog Admin Panel

The blog admin panel is accessible at `/admin` on your live site.

### Default credentials:

| Field | Value |
|---|---|
| URL | `https://YOUR_USERNAME.hackclub.app/admin` |
| Username | Value of `ADMIN_USERNAME` in `backend/.env` (default: `admin`) |
| Password | Value of `ADMIN_PASSWORD` in `backend/.env` |

> **Security:** Change the default password before going live! Edit `backend/.env` and restart the server.

### Admin features:

- **Create articles** — title, slug (auto-generated), category, author, image URL, excerpt, Markdown content
- **Edit articles** — update any field, toggle publish status
- **Delete articles** — with confirmation step to prevent accidents
- **Draft system** — save drafts before publishing; drafts are hidden from the public blog

### Markdown support:

The blog content editor supports basic Markdown:

```markdown
# Heading 1
## Heading 2
### Heading 3

Regular paragraph text.

**Bold text** and *italic text*

- List item one
- List item two
- List item three

---
```

---

## Updating the Site

### Content-only update (no code change):

Use the admin panel at `/admin` — no deployment needed.

### Code update:

```bash
# On the Nest server
cd ~/oskadusi
./deploy/deploy.sh
```

### Emergency rollback:

```bash
cd ~/oskadusi

# Roll back to the previous commit
git log --oneline -5     # find the commit hash to roll back to
git checkout <hash>

# Rebuild and restart
./deploy/deploy.sh
```

---

## Troubleshooting

### Server won't start / PM2 crash loop

```bash
# Check PM2 logs for the error
pm2 logs oskadusi --lines 50

# Common causes:
# 1. Missing .env file in backend/
# 2. Port 3001 already in use
# 3. TypeScript not compiled (backend/dist/ missing)

# Check if port is in use
lsof -i :3001

# Recompile backend
cd backend && npm run build && cd ..
pm2 restart oskadusi
```

### Database errors

```bash
# Check if the data directory exists and is writable
ls -la backend/data/

# Manually run migrations
cd backend
node -e "
  require('dotenv').config();
  const { runMigrations, seedAdmin } = require('./dist/db/schema');
  runMigrations();
  seedAdmin();
  console.log('Done.');
"
```

### Frontend build fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API returns 404 / CORS errors

1. Check that `FRONTEND_URL` in `backend/.env` matches your actual domain exactly (including `https://`)
2. Verify nginx is running and config is valid: `sudo nginx -t`
3. Check the backend is running: `pm2 list` and `curl http://localhost:3001/api/health`

### Can't log in to admin panel

```bash
# Reset the admin password
cd backend
nano .env  # change ADMIN_PASSWORD

# The seeder only creates the user if they don't exist.
# To force a password reset, run this in the backend directory:
node -e "
  require('dotenv').config();
  const Database = require('better-sqlite3');
  const bcrypt = require('bcryptjs');
  const db = new Database(process.env.DATABASE_PATH || './data/oskadusi.db');
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
  db.prepare('UPDATE admin_users SET password = ? WHERE username = ?')
    .run(hash, process.env.ADMIN_USERNAME);
  console.log('Password updated for:', process.env.ADMIN_USERNAME);
"

pm2 restart oskadusi
```

### Check health endpoint

```bash
curl http://localhost:3001/api/health
# Should return: {"success":true,"message":"OSKADUSI API is running","timestamp":"..."}
```

---

## Quick Reference Card

| Task | Command |
|---|---|
| Full deploy | `./deploy/deploy.sh` |
| View logs | `pm2 logs oskadusi` |
| Restart server | `pm2 restart oskadusi` |
| Check status | `pm2 list` |
| Monitor resources | `pm2 monit` |
| Test nginx config | `sudo nginx -t` |
| Reload nginx | `sudo systemctl reload nginx` |
| Health check | `curl localhost:3001/api/health` |

---

## Support

- **Hack Club Nest docs:** https://hackclub.com/nest/
- **Hack Club Slack:** Join `#nest` channel at https://hackclub.com/slack/
- **PM2 docs:** https://pm2.keymetrics.io/docs/
- **Project issues:** Open an issue on the GitHub repository

---

*OSKADUSI — Inspire. Empower. Transform.*
