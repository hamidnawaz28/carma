"""Runtime settings, read from environment variables."""

from __future__ import annotations

import os
import tempfile
from dataclasses import dataclass
from pathlib import Path


def _int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


@dataclass
class Settings:
    download_dir: Path = Path(
        os.environ.get("DOWNLOAD_DIR", Path(tempfile.gettempdir()) / "video-downloader")
    )
    # How long a finished file stays available for the browser to fetch.
    file_ttl_minutes: int = _int("FILE_TTL_MINUTES", 30)
    max_concurrent_downloads: int = _int("MAX_CONCURRENT_DOWNLOADS", 3)
    max_pending_jobs: int = _int("MAX_PENDING_JOBS", 20)
    max_filesize_mb: int = _int("MAX_FILESIZE_MB", 2048)
    # 0 disables the limit.
    max_duration_minutes: int = _int("MAX_DURATION_MINUTES", 180)
    max_quality_options: int = _int("MAX_QUALITY_OPTIONS", 6)
    # Optional Netscape-format cookies.txt, needed for some private/age-gated
    # Instagram/Facebook content.
    cookies_file: str | None = os.environ.get("COOKIES_FILE") or None
    # Optional outbound proxy for yt-dlp, e.g. http://user:pass@host:port
    proxy: str | None = os.environ.get("YTDLP_PROXY") or None


settings = Settings()
