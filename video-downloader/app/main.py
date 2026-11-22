"""FastAPI app: JSON API + static frontend."""

from __future__ import annotations

import logging
import shutil
import threading
import time
import uuid
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.background import BackgroundTask
from pydantic import BaseModel, Field

from .config import settings
from .downloader import (
    ExtractionError,
    JobManager,
    TooManyJobs,
    _format_opts,
    download_file,
    fetch_info,
)
from .platforms import UnsupportedURL, detect_platform, normalize_url

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

STATIC_DIR = Path(__file__).parent / "static"
jobs = JobManager()


@asynccontextmanager
async def lifespan(_: FastAPI):
    jobs.start()
    yield
    jobs.shutdown()


app = FastAPI(title="Video Downloader", lifespan=lifespan)


# --------------------------------------------------------------------------- #
# Tiny per-IP rate limiter (in-memory, per process)
# --------------------------------------------------------------------------- #

RATE_LIMIT = 30  # requests
RATE_WINDOW = 60  # seconds
_hits: dict[str, deque[float]] = defaultdict(deque)
_hits_lock = threading.Lock()


def _rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    with _hits_lock:
        q = _hits[ip]
        while q and now - q[0] > RATE_WINDOW:
            q.popleft()
        if len(q) >= RATE_LIMIT:
            raise HTTPException(429, "Too many requests — please wait a minute and try again.")
        q.append(now)


# --------------------------------------------------------------------------- #
# API
# --------------------------------------------------------------------------- #


class InfoRequest(BaseModel):
    url: str = Field(..., max_length=2048)


class DownloadRequest(BaseModel):
    url: str = Field(..., max_length=2048)
    quality: str = Field("best", max_length=16)


def _validate(url: str) -> tuple[str, str]:
    try:
        platform = detect_platform(url)
    except UnsupportedURL as exc:
        raise HTTPException(400, str(exc)) from exc
    return normalize_url(url), platform


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/info")
def info(body: InfoRequest, request: Request) -> dict:
    _rate_limit(request)
    url, platform = _validate(body.url)
    try:
        return fetch_info(url, platform)
    except ExtractionError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.post("/api/download", status_code=202)
def start_download(body: DownloadRequest, request: Request) -> dict:
    _rate_limit(request)
    url, platform = _validate(body.url)
    try:
        job = jobs.create(url, platform, body.quality)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except TooManyJobs as exc:
        raise HTTPException(503, "The server is busy — please try again shortly.") from exc
    return job.public()


@app.get("/api/jobs/{job_id}")
def job_status(job_id: str) -> dict:
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Download not found or expired.")
    return job.public()


@app.get("/api/jobs/{job_id}/file")
def job_file(job_id: str) -> FileResponse:
    job = jobs.get(job_id)
    if not job or job.status != "finished" or not job.filepath or not job.filepath.exists():
        raise HTTPException(404, "File not ready or expired.")
    media_type = "audio/mpeg" if job.filepath.suffix == ".mp3" else None
    return FileResponse(job.filepath, filename=job.filename, media_type=media_type)


_stream_slots = threading.BoundedSemaphore(settings.max_concurrent_downloads)


@app.get("/api/stream")
def stream_download(url: str, request: Request, quality: str = "best") -> FileResponse:
    """Download on the server and return the file in this same response.

    Stateless (no job registry), so it works on serverless hosts where the
    next request may land on a different instance.
    """
    _rate_limit(request)
    url, _platform = _validate(url)
    try:
        _format_opts(quality)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    if not _stream_slots.acquire(blocking=False):
        raise HTTPException(503, "The server is busy — please try again shortly.")

    workdir = settings.download_dir / f"s-{uuid.uuid4().hex}"
    try:
        path = download_file(url, quality, workdir)
    except ExtractionError as exc:
        shutil.rmtree(workdir, ignore_errors=True)
        raise HTTPException(422, str(exc)) from exc
    except Exception:
        shutil.rmtree(workdir, ignore_errors=True)
        raise
    finally:
        _stream_slots.release()

    media_type = "audio/mpeg" if path.suffix == ".mp3" else None
    return FileResponse(
        path,
        filename=path.name,
        media_type=media_type,
        background=BackgroundTask(shutil.rmtree, workdir, ignore_errors=True),
    )


@app.get("/api/config")
def public_config() -> dict:
    return {
        "mode": "stream" if settings.stateless else "jobs",
        "max_filesize_mb": settings.max_filesize_mb,
        "max_duration_minutes": settings.max_duration_minutes,
        "file_ttl_minutes": settings.file_ttl_minutes,
    }


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
