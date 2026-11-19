"""Supported platforms and URL validation."""

from __future__ import annotations

from urllib.parse import urlparse

# Platform key -> registrable domains that belong to it.
PLATFORM_DOMAINS: dict[str, tuple[str, ...]] = {
    "youtube": ("youtube.com", "youtu.be", "youtube-nocookie.com"),
    "facebook": ("facebook.com", "fb.watch", "fb.com"),
    "instagram": ("instagram.com", "instagr.am"),
    "tiktok": ("tiktok.com",),
}

PLATFORM_LABELS = {
    "youtube": "YouTube",
    "facebook": "Facebook",
    "instagram": "Instagram",
    "tiktok": "TikTok",
}


class UnsupportedURL(ValueError):
    pass


def detect_platform(url: str) -> str:
    """Return the platform key for ``url`` or raise ``UnsupportedURL``.

    Only http(s) links whose host is one of the supported domains (or a
    subdomain of one, e.g. ``m.youtube.com``, ``vm.tiktok.com``) are accepted,
    so the server can't be used to fetch arbitrary hosts.
    """
    url = (url or "").strip()
    if not url:
        raise UnsupportedURL("Please paste a video link.")
    if len(url) > 2048:
        raise UnsupportedURL("That link is too long.")

    parsed = urlparse(url if "://" in url else f"https://{url}")
    if parsed.scheme not in ("http", "https"):
        raise UnsupportedURL("Only http(s) links are supported.")

    host = (parsed.hostname or "").lower().rstrip(".")
    for platform, domains in PLATFORM_DOMAINS.items():
        for domain in domains:
            if host == domain or host.endswith("." + domain):
                return platform

    raise UnsupportedURL(
        "Unsupported link. Paste a YouTube, Facebook, Instagram or TikTok video/reel URL."
    )


def normalize_url(url: str) -> str:
    url = url.strip()
    return url if "://" in url else f"https://{url}"
