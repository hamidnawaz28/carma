"""Quality option building + yt-dlp format selection on synthetic YouTube-like formats."""

import yt_dlp

from app.downloader import _format_opts, _quality_options


def fmt(fid, height=None, vcodec="none", acodec="none", ext="mp4", size=None, tbr=None):
    return {
        "format_id": fid, "url": f"https://example.invalid/{fid}", "ext": ext,
        "height": height, "width": height and height * 16 // 9,
        "vcodec": vcodec, "acodec": acodec, "filesize": size, "tbr": tbr,
        "protocol": "https",
    }


FORMATS = [
    fmt("140", acodec="mp4a.40.2", ext="m4a", size=3_000_000, tbr=128),
    fmt("251", acodec="opus", ext="webm", size=3_200_000, tbr=140),
    fmt("134", 360, "avc1.4d401e", size=5_000_000, tbr=600),
    fmt("136", 720, "avc1.4d401f", size=20_000_000, tbr=2500),
    fmt("247", 720, "vp9", ext="webm", size=18_000_000, tbr=2200),
    fmt("137", 1080, "avc1.640028", size=40_000_000, tbr=4500),
    fmt("401", 2160, "av01.0.12M.08", size=200_000_000, tbr=18000),
    fmt("18", 360, "avc1.42001E", "mp4a.40.2", size=8_000_000, tbr=700),
]
INFO = {"id": "x", "title": "t", "extractor": "test", "extractor_key": "Test",
        "webpage_url": "https://example.invalid", "formats": FORMATS}


def selected(choice):
    opts = {"quiet": True, "simulate": True, **_format_opts(choice)}
    opts.pop("postprocessors", None)
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.process_ie_result(dict(INFO, formats=[dict(f) for f in FORMATS]), download=False)
    return [f["format_id"] for f in info.get("requested_formats") or [info]]


def test_quality_options():
    opts = _quality_options(INFO)
    ids = [o["id"] for o in opts]
    assert ids == ["best", "2160", "1080", "720", "360", "audio"]
    by_id = {o["id"]: o for o in opts}
    assert by_id["2160"]["label"] == "2160p (4K)"
    # video-only size + best audio size
    assert by_id["720"]["size"] == 20_000_000 + 3_200_000
    assert by_id["best"]["size"] == by_id["2160"]["size"]


def test_height_choice_prefers_h264_at_that_resolution():
    assert selected("720") == ["136", "140"]
    assert selected("1080") == ["137", "140"]


def test_best_takes_highest_resolution():
    assert selected("best")[0] == "401"


def test_audio_picks_best_audio():
    assert selected("audio") in (["251"], ["140"])


def test_combined_only_sources():
    # Instagram/TikTok-style: only progressive formats, no height metadata.
    info = {"formats": [{"format_id": "0", "url": "u", "ext": "mp4"}]}
    assert [o["id"] for o in _quality_options(info)] == ["best", "audio"]


def test_friendly_errors():
    from yt_dlp.utils import DownloadError

    from app.downloader import _clean_error

    bot = DownloadError(
        "ERROR: [youtube] jNQXAC9IVRw: Sign in to confirm you\u2019re not a bot. "
        "Use --cookies-from-browser or --cookies for the authentication."
    )
    assert _clean_error(bot).startswith("YouTube is blocking downloads")
    silent = DownloadError("ERROR: Postprocessing: WARNING: unable to obtain file audio codec with ffprobe")
    assert "no audio track" in _clean_error(silent)


def test_cookies_env(monkeypatch, tmp_path):
    from app import config

    monkeypatch.setattr(config.tempfile, "gettempdir", lambda: str(tmp_path))
    monkeypatch.setenv("YTDLP_COOKIES", "# Netscape HTTP Cookie File\r\n.youtube.com\tTRUE\t/\tTRUE\t0\tA\tB")
    s = config.Settings(cookies_file=None)
    config._materialize_cookies(s)
    assert s.cookies_file == str(tmp_path / "ytdlp-cookies.txt")
    text = (tmp_path / "ytdlp-cookies.txt").read_text()
    assert "\r" not in text and text.startswith("# Netscape")
