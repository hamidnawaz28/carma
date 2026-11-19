"""API tests.

The end-to-end tests run the real yt-dlp + ffmpeg pipeline against a small MP4
served from a local HTTP server (yt-dlp's generic extractor), with the platform
allow-list patched to accept localhost. This exercises everything except the
site-specific extractors, which need internet access to YouTube etc.
"""

import functools
import http.server
import shutil
import subprocess
import threading
import time

import pytest
from fastapi.testclient import TestClient

from app import main


@pytest.fixture(scope="module")
def media_server(tmp_path_factory):
    root = tmp_path_factory.mktemp("media")
    if not shutil.which("ffmpeg"):
        pytest.skip("ffmpeg not installed")
    subprocess.run(
        [
            "ffmpeg", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", "testsrc=size=640x360:rate=25:duration=2",
            "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
            str(root / "clip.mp4"),
        ],
        check=True,
    )
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_port}/clip.mp4"
    server.shutdown()


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.setattr(main.settings, "download_dir", tmp_path / "dl")
    main._hits.clear()
    with TestClient(main.app) as c:
        yield c


@pytest.fixture
def allow_localhost(monkeypatch):
    real = main.detect_platform

    def fake(url):
        return "youtube" if "127.0.0.1" in url else real(url)

    monkeypatch.setattr(main, "detect_platform", fake)


def wait_for(client, job_id, timeout=60):
    deadline = time.time() + timeout
    while time.time() < deadline:
        job = client.get(f"/api/jobs/{job_id}").json()
        if job["status"] in ("finished", "error"):
            return job
        time.sleep(0.2)
    raise AssertionError("job did not finish in time")


def test_index_served(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Video Downloader" in r.text


def test_rejects_unsupported_url(client):
    r = client.post("/api/info", json={"url": "https://example.com/video.mp4"})
    assert r.status_code == 400
    assert "Unsupported" in r.json()["detail"]
    r = client.post("/api/download", json={"url": "http://127.0.0.1/x.mp4"})
    assert r.status_code == 400


def test_rejects_bad_quality(client):
    r = client.post(
        "/api/download", json={"url": "https://youtu.be/abc", "quality": "../../etc"}
    )
    assert r.status_code == 400


def test_unknown_job(client):
    assert client.get("/api/jobs/nope").status_code == 404
    assert client.get("/api/jobs/nope/file").status_code == 404


def test_info(client, allow_localhost, media_server):
    r = client.post("/api/info", json={"url": media_server})
    assert r.status_code == 200, r.text
    info = r.json()
    assert info["platform"] == "youtube"
    ids = [o["id"] for o in info["options"]]
    assert ids[0] == "best"
    assert "audio" in ids


@pytest.mark.parametrize("quality,ext,ctype", [("best", ".mp4", "video/mp4"), ("audio", ".mp3", "audio/mpeg")])
def test_download_end_to_end(client, allow_localhost, media_server, quality, ext, ctype):
    r = client.post("/api/download", json={"url": media_server, "quality": quality})
    assert r.status_code == 202, r.text
    job = wait_for(client, r.json()["id"])
    assert job["status"] == "finished", job
    assert job["filename"].endswith(ext)
    assert job["progress"] == 100

    f = client.get(f"/api/jobs/{job['id']}/file")
    assert f.status_code == 200
    assert f.headers["content-type"].startswith(ctype)
    assert "attachment" in f.headers["content-disposition"]
    assert len(f.content) == job["filesize"] > 1000


def test_download_error_reported(client, allow_localhost, media_server):
    missing = media_server.replace("clip.mp4", "missing.mp4")
    r = client.post("/api/download", json={"url": missing})
    job = wait_for(client, r.json()["id"])
    assert job["status"] == "error"
    assert job["error"]


def test_cleanup_removes_expired(client, allow_localhost, media_server):
    r = client.post("/api/download", json={"url": media_server, "quality": "audio"})
    job = wait_for(client, r.json()["id"])
    workdir = main.settings.download_dir / job["id"]
    assert workdir.exists()
    main.jobs.cleanup(now=time.time() + main.settings.file_ttl_minutes * 60 + 1)
    assert not workdir.exists()
    assert client.get(f"/api/jobs/{job['id']}").status_code == 404
