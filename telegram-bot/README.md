# OSKADUSI Telegram Bot

Companion Python bot for the OSKADUSI backend. It allows authorized admins to publish blog posts, monitor system status, and download media via Telegram.

## Features

- **Post Publishing**: `/post [title] | [content]`
- **System Monitoring**: `/status` (CPU, RAM, Disk metrics from backend)
- **Media Downloader**: `/dl [URL]` (Supports YouTube and other platforms via `yt-dlp`)
- **Security**: Restricted to specific Telegram User ID.

## Prerequisites

- Python 3.10+
- `ffmpeg` (Required by `yt-dlp` for merging video/audio)
- A running OSKADUSI Backend.

### Installing FFmpeg

**Arch Linux:**
```bash
sudo pacman -S ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

## Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone <your-new-repo-url>
   cd telegram-bot
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration:**
   Create a `.env` file or export the following variables:
   ```bash
   export TELEGRAM_BOT_TOKEN="your_bot_token"
   export TELEGRAM_WEBHOOK_SECRET="your_secret" # Must match backend
   export OSIS_API_BASE_URL="http://127.0.0.1:3001/api"
   ```

## Running the Bot

### Manual Run
```bash
source .venv/bin/activate
python osis_bot.py
```

### Production Deployment (PM2)
It is recommended to use PM2 to keep the bot running in the background.

1. **Install PM2:**
   ```bash
   npm install -g pm2
   ```

2. **Start the bot:**
   ```bash
   pm2 start osis_bot.py --name oskadusi-bot --interpreter .venv/bin/python
   ```

3. **Monitor & Logs:**
   ```bash
   pm2 logs oskadusi-bot
   pm2 status
   ```

4. **Persist on reboot:**
   ```bash
   pm2 save
   pm2 startup
   ```

## Security

The bot is hardcoded to only respond to user ID `7669464229`. You can change this in `osis_bot.py`:
```python
AUTHORIZED_TELEGRAM_USER_ID = 7669464229
```
