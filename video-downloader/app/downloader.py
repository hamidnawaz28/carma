"""yt-dlp wrapper: metadata extraction and a small background job manager."""

from __future__ import annotations

import logging
import re
import shutil
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yt_dlp
from yt_dlp.utils import DownloadError

from .config import settings
from .platforms import PLATFORM_LABELS

log = logging.getLogger(__name__)

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")


class ExtractionError(Exception):
    """A user-facing error from yt-dlp."""


class TooManyJobs(Exception):
    pass


# --------------------------------------------------------------------------- #
# yt-dlp options
# --------------------------------------------------------------------------- #


def _base_opts() -> dict[str, Any]:
    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "noplaylist": True,
        # Instagram carousels / multi-video posts come back as playlists:
        # only take the first item.
        "playlist_items": "1",
        "socket_timeout": 30,
        "retries": 3,
        "fragment_retries": 3,
        "windowsfilenames": True,
        "logger": log,
    }
    if settings.cookies_file:
        opts["cookiefile"] = settings.cookies_file
    if settings.proxy:
        opts["proxy"] = settings.proxy
    return opts


def _format_opts(choice: str) -> dict[str, Any]:
    """Translate a quality choice ("best", "720", "audio", ...) to yt-dlp opts."""
    if choice == "audio":
        return {
            "format": "ba/b",
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }
            ],
        }

    if choice == "best":
        sort = ["res", "vcodec:h264", "acodec:aac"]
    elif choice.isdigit():
        # Best resolution not above the chosen height; prefer H.264/AAC so the
        # merged MP4 plays everywhere.
        sort = [f"res:{int(choice)}", "vcodec:h264", "acodec:aac"]
    else:
        raise ValueError(f"Unknown quality option: {choice}")

    return {
        "format": "bv*+ba/b",
        "format_sort": sort,
        "merge_output_format": "mp4",
    }


def _clean_error(exc: BaseException) -> str:
    msg = ANSI_RE.sub("", str(exc)).strip()
    msg = re.sub(r"^ERROR:\s*", "", msg)
    msg = re.sub(r"^\[[\w:]+\]\s*[\w-]+:\s*", "", msg)
    # Drop yt-dlp's "please report this issue..." boilerplate and nested causes.
    msg = re.split(r";\s*please report this issue|\s*\(caused by ", msg, maxsplit=1)[0].strip()
    lower = msg.lower()
    if any(s in lower for s in ("unable to download webpage", "connect tunnel failed",
                                "timed out", "name or service not known", "connection refused")):
        return "Couldn't reach the site right now. Check the link and try again in a moment."
    if "login" in lower or "cookies" in lower or "private" in lower or "rate-limit" in lower:
        msg += (
            " — this content may be private or require login. "
            "The server admin can configure a cookies file (COOKIES_FILE)."
        )
    if "file is larger than max-filesize" in lower or "larger than max" in lower:
        msg = f"This video is larger than the {settings.max_filesize_mb} MB limit."
    return msg or "Could not process this link."


def _pick_entry(info: dict[str, Any]) -> dict[str, Any]:
    """Return the single video entry from an extract_info result."""
    if info.get("_type") in ("playlist", "multi_video"):
        entries = [e for e in (info.get("entries") or []) if e]
        if not entries:
            raise ExtractionError("No downloadable video found at this link.")
        return entries[0]
    return info


# --------------------------------------------------------------------------- #
# Metadata
# --------------------------------------------------------------------------- #


def _approx_size(fmt: dict[str, Any]) -> int | None:
    return fmt.get("filesize") or fmt.get("filesize_approx")


def _quality_options(info: dict[str, Any]) -> list[dict[str, Any]]:
    formats = info.get("formats") or []
    videos = [
        f for f in formats
        if f.get("vcodec") not in (None, "none") and f.get("height")
    ]
    audios = [
        f for f in formats
        if f.get("vcodec") == "none" and f.get("acodec") not in (None, "none")
    ]
    best_audio_size = max((_approx_size(a) or 0 for a in audios), default=0)

    by_height: dict[int, int | None] = {}
    for f in videos:
        h = int(f["height"])
        size = _approx_size(f)
        if size and f.get("acodec") in (None, "none"):
            size += best_audio_size
        prev = by_height.get(h)
        by_height[h] = max(filter(None, (prev, size)), default=None)

    options: list[dict[str, Any]] = [
        {"id": "best", "label": "Best quality", "kind": "video", "ext": "mp4", "size": None}
    ]
    heights = sorted(by_height, reverse=True)[: settings.max_quality_options]
    for h in heights:
        label = f"{h}p"
        if h >= 2160:
            label += " (4K)"
        elif h >= 1440:
            label += " (2K)"
        elif h >= 720:
            label += " (HD)"
        options.append(
            {"id": str(h), "label": label, "kind": "video", "ext": "mp4", "size": by_height[h]}
        )
    if heights:
        options[0]["size"] = by_height[heights[0]]

    # Offer audio unless every known format is explicitly video-only.
    has_audio = any(f.get("acodec") != "none" for f in formats) if formats else (
        info.get("acodec") != "none"
    )
    if has_audio:
        options.append(
            {
                "id": "audio",
                "label": "Audio only (MP3)",
                "kind": "audio",
                "ext": "mp3",
                "size": None,
            }
        )
    return options


def fetch_info(url: str, platform: str) -> dict[str, Any]:
    opts = _base_opts() | {"skip_download": True}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            raw = ydl.extract_info(url, download=False)
    except DownloadError as exc:
        raise ExtractionError(_clean_error(exc)) from exc

    if not raw:
        raise ExtractionError("No downloadable video found at this link.")
    info = _pick_entry(raw)

    thumbnail = info.get("thumbnail")
    if not thumbnail and info.get("thumbnails"):
        thumbnail = info["thumbnails"][-1].get("url")

    return {
        "url": url,
        "platform": platform,
        "platform_label": PLATFORM_LABELS.get(platform, platform),
        "id": info.get("id"),
        "title": info.get("title") or info.get("description") or "Untitled video",
        "uploader": info.get("uploader") or info.get("channel") or info.get("uploader_id"),
        "duration": info.get("duration"),
        "thumbnail": thumbnail,
        "view_count": info.get("view_count"),
        "is_live": bool(info.get("is_live")),
        "options": _quality_options(info),
    }


# --------------------------------------------------------------------------- #
# Download jobs
# --------------------------------------------------------------------------- #


@dataclass
class Job:
    url: str
    platform: str
    quality: str
    id: str = field(default_factory=lambda: uuid.uuid4().hex)
    status: str = "queued"  # queued | downloading | processing | finished | error
    progress: float = 0.0
    speed: float | None = None
    eta: int | None = None
    title: str | None = None
    filename: str | None = None
    filesize: int | None = None
    error: str | None = None
    created_at: float = field(default_factory=time.time)
    finished_at: float | None = None
    filepath: Path | None = None
    # internal progress bookkeeping for multi-stream (video + audio) downloads
    _parts_total: int = 1
    _parts_done: int = 0

    @property
    def workdir(self) -> Path:
        return settings.download_dir / self.id

    def public(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "status": self.status,
            "progress": round(self.progress, 1),
            "speed": self.speed,
            "eta": self.eta,
            "title": self.title,
            "filename": self.filename,
            "filesize": self.filesize,
            "error": self.error,
            "quality": self.quality,
            "platform": self.platform,
        }


class JobManager:
    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._pool: ThreadPoolExecutor | None = None
        self._stop = threading.Event()
        self._janitor: threading.Thread | None = None

    # -- lifecycle ---------------------------------------------------------- #

    def start(self) -> None:
        shutil.rmtree(settings.download_dir, ignore_errors=True)
        settings.download_dir.mkdir(parents=True, exist_ok=True)
        self._pool = ThreadPoolExecutor(
            max_workers=settings.max_concurrent_downloads, thread_name_prefix="dl"
        )
        self._stop = threading.Event()
        self._janitor = threading.Thread(target=self._cleanup_loop, daemon=True)
        self._janitor.start()

    def shutdown(self) -> None:
        self._stop.set()
        if self._pool:
            self._pool.shutdown(wait=False, cancel_futures=True)
            self._pool = None

    # -- public API --------------------------------------------------------- #

    def create(self, url: str, platform: str, quality: str) -> Job:
        _format_opts(quality)  # validate early
        if self._pool is None:
            raise RuntimeError("JobManager.start() has not been called")
        with self._lock:
            active = sum(
                1 for j in self._jobs.values() if j.status in ("queued", "downloading", "processing")
            )
            if active >= settings.max_pending_jobs:
                raise TooManyJobs()
            job = Job(url=url, platform=platform, quality=quality)
            self._jobs[job.id] = job
        self._pool.submit(self._run, job)
        return job

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    # -- worker ------------------------------------------------------------- #

    def _progress_hook(self, job: Job, d: dict[str, Any]) -> None:
        status = d.get("status")
        if status == "downloading":
            job.status = "downloading"
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            done = d.get("downloaded_bytes") or 0
            frac = (done / total) if total else 0.0
            overall = (job._parts_done + min(frac, 1.0)) / max(job._parts_total, 1)
            job.progress = max(job.progress, min(overall * 100, 99.0))
            job.speed = d.get("speed")
            job.eta = d.get("eta")
        elif status == "finished":
            job._parts_done += 1

    def _pp_hook(self, job: Job, d: dict[str, Any]) -> None:
        if d.get("status") == "started":
            job.status = "processing"
            job.speed = None
            job.eta = None

    def _run(self, job: Job) -> None:
        workdir = job.workdir
        workdir.mkdir(parents=True, exist_ok=True)
        opts = (
            _base_opts()
            | _format_opts(job.quality)
            | {
                "outtmpl": str(workdir / "%(title).80B [%(id)s].%(ext)s"),
                "max_filesize": settings.max_filesize_mb * 1024 * 1024,
                "progress_hooks": [lambda d: self._progress_hook(job, d)],
                "postprocessor_hooks": [lambda d: self._pp_hook(job, d)],
            }
        )
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                raw = ydl.extract_info(job.url, download=False)
                if not raw:
                    raise ExtractionError("No downloadable video found at this link.")
                entry = _pick_entry(raw)
                job.title = entry.get("title")
                if entry.get("is_live"):
                    raise ExtractionError("Live streams can't be downloaded.")
                duration = entry.get("duration") or 0
                if settings.max_duration_minutes and duration > settings.max_duration_minutes * 60:
                    raise ExtractionError(
                        f"Videos longer than {settings.max_duration_minutes} minutes aren't allowed."
                    )
                job._parts_total = len(entry.get("requested_formats") or []) or 1
                job.status = "downloading"
                ydl.process_ie_result(entry, download=True)

            files = [
                p for p in workdir.iterdir()
                if p.is_file() and not p.name.endswith((".part", ".ytdl", ".temp"))
            ]
            if not files:
                raise ExtractionError(
                    f"Download produced no file (it may exceed the {settings.max_filesize_mb} MB limit)."
                )
            final = max(files, key=lambda p: p.stat().st_size)
            job.filepath = final
            job.filename = final.name
            job.filesize = final.stat().st_size
            job.progress = 100.0
            job.status = "finished"
        except ExtractionError as exc:
            job.status, job.error = "error", str(exc)
        except DownloadError as exc:
            job.status, job.error = "error", _clean_error(exc)
        except Exception as exc:  # pragma: no cover - defensive
            log.exception("download job %s failed", job.id)
            job.status, job.error = "error", f"Unexpected error: {exc}"
        finally:
            job.finished_at = time.time()
            job.speed = job.eta = None
            if job.status == "error":
                shutil.rmtree(workdir, ignore_errors=True)

    # -- housekeeping ------------------------------------------------------- #

    def _cleanup_loop(self) -> None:
        while not self._stop.wait(60):
            self.cleanup()

    def cleanup(self, now: float | None = None) -> None:
        now = now or time.time()
        ttl = settings.file_ttl_minutes * 60
        with self._lock:
            expired = [
                j for j in self._jobs.values()
                if j.finished_at and now - j.finished_at > ttl
            ]
            for job in expired:
                del self._jobs[job.id]
        for job in expired:
            shutil.rmtree(job.workdir, ignore_errors=True)
