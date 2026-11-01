"""Same-origin check for browser WebSocket handshakes and go2rtc stream requests."""

from urllib.parse import urlsplit


def _hostname(value: str) -> str | None:
    try:
        return urlsplit(value).hostname
    except ValueError:
        return None


def origin_allowed(
    origin: str | None, host: str | None, forwarded_host: str | None
) -> bool:
    """Return True unless a browser sent the request from a foreign origin.

    Browsers always send Origin on a WebSocket handshake, so a missing Origin
    means a non-browser client. A page cannot add headers to a handshake, so
    X-Forwarded-Host comes from a proxy. Ports are ignored because nginx
    forwards Host without one.
    """
    if origin is None:
        return True

    origin_host = _hostname(origin)
    if not origin_host:
        return False

    hosts = ((forwarded_host or "").split(",")[0].strip(), host or "")
    return any(origin_host == _hostname(f"//{h}") for h in hosts if h)
