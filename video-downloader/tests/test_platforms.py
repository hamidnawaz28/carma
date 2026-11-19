import pytest

from app.platforms import UnsupportedURL, detect_platform


@pytest.mark.parametrize(
    "url,expected",
    [
        ("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"),
        ("https://youtu.be/dQw4w9WgXcQ", "youtube"),
        ("https://m.youtube.com/shorts/abc123", "youtube"),
        ("youtube.com/watch?v=abc", "youtube"),
        ("https://www.facebook.com/reel/123456789", "facebook"),
        ("https://fb.watch/abcDEF/", "facebook"),
        ("https://www.instagram.com/reel/C1abcDEF/", "instagram"),
        ("https://www.instagram.com/p/C1abcDEF/", "instagram"),
        ("https://www.tiktok.com/@user/video/7234567890123456789", "tiktok"),
        ("https://vm.tiktok.com/ZMabc/", "tiktok"),
    ],
)
def test_supported(url, expected):
    assert detect_platform(url) == expected


@pytest.mark.parametrize(
    "url",
    [
        "",
        "https://vimeo.com/123",
        "https://evil.com/youtube.com",
        "https://youtube.com.evil.com/watch",
        "https://notyoutube.com/watch?v=1",
        "ftp://youtube.com/x",
        "file:///etc/passwd",
        "http://127.0.0.1:8000/",
    ],
)
def test_rejected(url):
    with pytest.raises(UnsupportedURL):
        detect_platform(url)
