#!/usr/bin/env bash
# ==============================================================================
# deploy.sh — OSKADUSI Automated Deployment Script
# Hack Club Nest Server
#
# Usage:
#   chmod +x deploy/deploy.sh
#   ./deploy/deploy.sh
#
# What this script does:
#   1. Pulls latest code from git
#   2. Installs/updates frontend dependencies
#   3. Builds the React frontend (Vite)
#   4. Installs/updates backend dependencies
#   5. Compiles the TypeScript backend
#   6. Creates .env files if they don't exist
#   7. Runs database migrations
#   8. Restarts the PM2 process
# ==============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────
log()     { echo -e "${BLUE}[DEPLOY]${RESET} $*"; }
success() { echo -e "${GREEN}[✓]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[!]${RESET} $*"; }
error()   { echo -e "${RED}[✗]${RESET} $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}${BLUE}── $* ──────────────────────────────────────${RESET}"; }

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT"
BACKEND_DIR="$PROJECT_ROOT/backend"
LOGS_DIR="$PROJECT_ROOT/logs"
APP_NAME="oskadusi"

log "Starting deployment for ${BOLD}OSKADUSI${RESET}"
log "Project root: $PROJECT_ROOT"
echo ""

# ── Prerequisite checks ───────────────────────────────────────────────────────
step "Checking prerequisites"

command -v node  >/dev/null 2>&1 || error "node is not installed. Install Node.js 18+ first."
command -v npm   >/dev/null 2>&1 || error "npm is not installed."
command -v pm2   >/dev/null 2>&1 || error "pm2 is not installed. Run: npm install -g pm2"

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js 18+ is required. Current version: $(node --version)"
fi

success "Node $(node --version) · npm $(npm --version) · pm2 $(pm2 --version)"

# ── Create required directories ───────────────────────────────────────────────
step "Setting up directories"

mkdir -p "$LOGS_DIR"
mkdir -p "$BACKEND_DIR/data"
success "Directories ready"

# ── Git pull ──────────────────────────────────────────────────────────────────
step "Pulling latest code"

cd "$PROJECT_ROOT"

if git rev-parse --git-dir >/dev/null 2>&1; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  log "Current branch: $CURRENT_BRANCH"

  if [ -n "$(git status --porcelain)" ]; then
    warn "Working directory has uncommitted changes. Stashing..."
    git stash push -m "deploy-stash-$(date +%Y%m%d%H%M%S)"
  fi

  git pull origin "$CURRENT_BRANCH"
  success "Code updated · $(git rev-parse --short HEAD)"
else
  warn "Not a git repository — skipping git pull"
fi

# ── Environment files ─────────────────────────────────────────────────────────
step "Checking environment files"

# Frontend .env
if [ ! -f "$FRONTEND_DIR/.env" ]; then
  if [ -f "$FRONTEND_DIR/.env.example" ]; then
    cp "$FRONTEND_DIR/.env.example" "$FRONTEND_DIR/.env"
    warn "Created frontend .env from .env.example — review and update it!"
  else
    echo "VITE_API_URL=/api" > "$FRONTEND_DIR/.env"
    warn "Created minimal frontend .env — VITE_API_URL set to /api"
  fi
else
  success "Frontend .env exists"
fi

# Backend .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
  if [ -f "$BACKEND_DIR/.env.example" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    warn "Created backend .env from .env.example"
    warn "IMPORTANT: Edit $BACKEND_DIR/.env and set a strong JWT_SECRET and ADMIN_PASSWORD!"
  else
    cat > "$BACKEND_DIR/.env" <<EOF
PORT=3001
NODE_ENV=production
JWT_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 48)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=oskadusi$(date +%Y)
FRONTEND_URL=https://localhost
DATABASE_PATH=./data/oskadusi.db
EOF
    warn "Created backend .env with auto-generated JWT_SECRET"
    warn "IMPORTANT: Change ADMIN_PASSWORD in $BACKEND_DIR/.env!"
  fi
else
  success "Backend .env exists"
fi

# ── Frontend: install & build ─────────────────────────────────────────────────
step "Building frontend"

cd "$FRONTEND_DIR"
log "Installing frontend dependencies..."
npm ci --prefer-offline --no-audit 2>&1 | tail -3

log "Building React app with Vite..."
npm run build

if [ ! -d "$FRONTEND_DIR/dist" ]; then
  error "Build failed — dist/ directory not found"
fi

DIST_SIZE=$(du -sh "$FRONTEND_DIR/dist" 2>/dev/null | cut -f1)
success "Frontend built → dist/ ($DIST_SIZE)"

# ── Backend: install & compile ────────────────────────────────────────────────
step "Building backend"

cd "$BACKEND_DIR"
log "Installing backend dependencies..."
npm ci --prefer-offline --no-audit --omit=dev 2>&1 | tail -3
# Also install dev deps for TypeScript compilation
npm install --no-audit 2>&1 | tail -3

log "Compiling TypeScript..."
npm run build

if [ ! -f "$BACKEND_DIR/dist/index.js" ]; then
  error "TypeScript compilation failed — dist/index.js not found"
fi

success "Backend compiled → dist/"

# ── Database migrations ───────────────────────────────────────────────────────
step "Running database migrations"

cd "$BACKEND_DIR"
NODE_ENV=production node -e "
  require('dotenv').config();
  const { runMigrations, seedAdmin } = require('./dist/db/schema');
  runMigrations();
  seedAdmin();
  console.log('Migrations complete.');
"
success "Database ready"

# ── PM2: start or restart ─────────────────────────────────────────────────────
step "Managing PM2 process"

cd "$PROJECT_ROOT"

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  log "Process '$APP_NAME' found — restarting..."
  pm2 restart ecosystem.config.cjs --update-env
  success "Process restarted"
else
  log "Starting new process '$APP_NAME'..."
  pm2 start ecosystem.config.cjs
  success "Process started"
fi

# Save PM2 process list so it survives reboots
pm2 save

# ── Health check ──────────────────────────────────────────────────────────────
step "Health check"

log "Waiting for server to be ready..."
sleep 4

HEALTH_URL="http://localhost:3001/api/health"
MAX_ATTEMPTS=10
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    RESPONSE=$(curl -s "$HEALTH_URL")
    success "Server is healthy → $HEALTH_URL"
    success "Response: $RESPONSE"
    break
  else
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
      warn "Health check failed after $MAX_ATTEMPTS attempts"
      warn "Check logs with: pm2 logs $APP_NAME"
    else
      log "Attempt $ATTEMPT/$MAX_ATTEMPTS — waiting..."
      sleep 2
    fi
    ATTEMPT=$((ATTEMPT + 1))
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}${BOLD}║        OSKADUSI Deployment Complete!         ║${RESET}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════╣${RESET}"
echo -e "${GREEN}${BOLD}║${RESET}  Site   : http://localhost:3001              ${GREEN}${BOLD}║${RESET}"
echo -e "${GREEN}${BOLD}║${RESET}  API    : http://localhost:3001/api          ${GREEN}${BOLD}║${RESET}"
echo -e "${GREEN}${BOLD}║${RESET}  Admin  : http://localhost:3001/admin        ${GREEN}${BOLD}║${RESET}"
echo -e "${GREEN}${BOLD}║${RESET}  Logs   : pm2 logs $APP_NAME                  ${GREEN}${BOLD}║${RESET}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${RESET}"
echo ""
warn "Don't forget to set up nginx reverse proxy!"
warn "Config template: deploy/nginx.conf"
echo ""
