#!/usr/bin/env python3
"""Telegram bot companion for the OSKADUSI backend."""

from __future__ import annotations

import asyncio
import json
import mimetypes
import os
import re
import shutil
import uuid
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import Application, CommandHandler, ContextTypes
from yt_dlp import YoutubeDL

AUTHORIZED_TELEGRAM_USER_ID = 7669464229

BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
API_BASE_URL = os.environ.get("OSIS_API_BASE_URL", "http://127.0.0.1:3001/api")
API_SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")
DOWNLOAD_DIR = Path(os.environ.get("OSIS_BOT_DOWNLOAD_DIR", "/tmp"))
MAX_UPLOAD_BYTES = int(
    os.environ.get("OSIS_BOT_MAX_UPLOAD_BYTES", str(48 * 1024 * 1024))
)


def _is_authorized(update: Update) -> bool:
    user = update.effective_user
    return bool(user and user.id == AUTHORIZED_TELEGRAM_USER_ID)


async def _reject_unauthorized(update: Update) -> None:
    if update.effective_message:
        await update.effective_message.reply_text("Unauthorized.")


def _api_request(method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {
        "Content-Type": "application/json",
        "x-telegram-admin-id": str(AUTHORIZED_TELEGRAM_USER_ID),
    }
    if API_SECRET:
        headers["x-telegram-bot-api-secret-token"] = API_SECRET

    request = Request(
        f"{API_BASE_URL}{path}",
        data=body,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=20) as response:
            data = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Backend returned HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"Backend is unreachable: {exc.reason}") from exc

    parsed = json.loads(data)
    if not parsed.get("success"):
        raise RuntimeError(parsed.get("error") or "Backend API request failed")
    return parsed.get("data")


async def post_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_authorized(update):
        await _reject_unauthorized(update)
        return

    message = update.effective_message
    if not message:
        return

    raw = message.text or ""
    payload = raw.removeprefix("/post").strip()
    if "|" not in payload:
        await message.reply_text("Usage: /post title | content")
        return

    title, content = [part.strip() for part in payload.split("|", 1)]
    if not title or not content:
        await message.reply_text("Title and content cannot be empty.")
        return

    try:
        data = await asyncio.to_thread(
            _api_request,
            "POST",
            "/blog",
            {"title": title, "content": content, "author": "Telegram Bot"},
        )
    except RuntimeError as exc:
        await message.reply_text(f"Failed to publish post:\n{exc}")
        return

    post = data.get("post", {}) if isinstance(data, dict) else {}
    slug = post.get("slug", "-")
    await message.reply_text(f"Published.\nTitle: {title}\nSlug: {slug}")


def _format_bytes(value: int) -> str:
    units = ["B", "KB", "MB", "GB", "TB"]
    size = float(value)
    for unit in units:
        if size < 1024 or unit == units[-1]:
            return f"{size:.1f} {unit}" if unit != "B" else f"{int(size)} {unit}"
        size /= 1024
    return f"{value} B"


async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_authorized(update):
        await _reject_unauthorized(update)
        return

    message = update.effective_message
    if not message:
        return

    try:
        metrics = await asyncio.to_thread(_api_request, "GET", "/status")
    except RuntimeError as exc:
        await message.reply_text(f"Failed to read status:\n{exc}")
        return

    cpu = metrics["cpu"]
    ram = metrics["ram"]
    disk = metrics["disk"]
    text = (
        "OSKADUSI System Status\n"
        f"CPU: {cpu['usagePercent']}% ({cpu['cores']} cores)\n"
        f"Load: {', '.join(str(round(value, 2)) for value in cpu['loadAverage'])}\n"
        f"RAM: {ram['usagePercent']}% "
        f"({_format_bytes(ram['usedBytes'])} / {_format_bytes(ram['totalBytes'])})\n"
        f"Disk: {disk['usagePercent']}% "
        f"({_format_bytes(disk['usedBytes'])} / {_format_bytes(disk['totalBytes'])})\n"
        f"Mount: {disk['mount']}"
    )
    await message.reply_text(text)


def _find_downloaded_file(work_dir: Path) -> Path:
    files = [path for path in work_dir.iterdir() if path.is_file()]
    if not files:
        raise RuntimeError("yt-dlp finished but no file was created.")
    return max(files, key=lambda path: path.stat().st_mtime)


def _download_media(url: str) -> tuple[Path, str]:
    work_dir = DOWNLOAD_DIR / f"osis-dl-{uuid.uuid4().hex}"
    work_dir.mkdir(parents=True, exist_ok=False)

    output_template = str(work_dir / "%(title).120B-%(id)s.%(ext)s")
    options = {
        "format": "bestvideo+bestaudio/best",
        "merge_output_format": "mp4",
        "noplaylist": True,
        "outtmpl": output_template,
        "quiet": True,
        "restrictfilenames": True,
    }

    try:
        with YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=True)
        title = str(info.get("title") or "download")
        return _find_downloaded_file(work_dir), title
    except Exception:
        shutil.rmtree(work_dir, ignore_errors=True)
        raise


def _looks_like_url(value: str) -> bool:
    return bool(re.match(r"^https?://", value.strip(), re.IGNORECASE))


async def download_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_authorized(update):
        await _reject_unauthorized(update)
        return

    message = update.effective_message
    chat = update.effective_chat
    if not message or not chat:
        return

    if not context.args:
        await message.reply_text("Usage: /dl URL")
        return

    url = context.args[0].strip()
    if not _looks_like_url(url):
        await message.reply_text("Please send a valid http/https URL.")
        return

    await chat.send_action(ChatAction.TYPING)
    progress = await message.reply_text("Downloading...")

    downloaded_file: Path | None = None
    work_dir: Path | None = None

    try:
        downloaded_file, title = await asyncio.to_thread(_download_media, url)
        work_dir = downloaded_file.parent
        file_size = downloaded_file.stat().st_size

        if file_size > MAX_UPLOAD_BYTES:
            raise RuntimeError(
                f"Downloaded file is too large for this bot limit: {_format_bytes(file_size)}"
            )

        await progress.edit_text(f"Uploading: {title}\nSize: {_format_bytes(file_size)}")
        mime_type = mimetypes.guess_type(downloaded_file.name)[0] or ""

        with downloaded_file.open("rb") as media:
            if mime_type.startswith("video/"):
                await message.reply_video(
                    video=media,
                    caption=title,
                    read_timeout=120,
                    write_timeout=120,
                )
            elif mime_type.startswith("audio/"):
                await message.reply_audio(
                    audio=media,
                    caption=title,
                    read_timeout=120,
                    write_timeout=120,
                )
            else:
                await message.reply_document(
                    document=media,
                    caption=title,
                    read_timeout=120,
                    write_timeout=120,
                )

        await progress.delete()
    except Exception as exc:
        await progress.edit_text(f"Download failed:\n{exc}")
    finally:
        if downloaded_file and downloaded_file.exists():
            try:
                os.remove(downloaded_file)
            except OSError:
                pass
        if work_dir and work_dir.exists():
            shutil.rmtree(work_dir, ignore_errors=True)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _is_authorized(update):
        await _reject_unauthorized(update)
        return

    if update.effective_message:
        await update.effective_message.reply_text(
            "Commands:\n"
            "/post title | content\n"
            "/status\n"
            "/dl URL"
        )


def main() -> None:
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("post", post_command))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(CommandHandler("dl", download_command))
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
