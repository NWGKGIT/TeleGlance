"""Small parsing helpers shared across modules."""

from __future__ import annotations

import re

_BG_URL_RE = re.compile(r"background-image\s*:\s*url\(\s*['\"]?(.*?)['\"]?\s*\)", re.I)
_COUNT_RE = re.compile(r"([\d\s.,]+)\s*([KMB]?)", re.I)

_MULTIPLIERS = {"": 1, "K": 1_000, "M": 1_000_000, "B": 1_000_000_000}


def bg_image_url(style: str | None) -> str | None:
    """Extract the URL from an inline ``background-image`` style."""
    if not style:
        return None
    m = _BG_URL_RE.search(style)
    return m.group(1) or None if m else None


def parse_count(value: str | None) -> int | None:
    """Parse display counts like ``"36.6K"``, ``"1.2M"`` or ``"12 345"``.

    Values with a suffix are approximate by nature; plain numbers are exact.
    """
    if not value:
        return None
    m = _COUNT_RE.search(value.strip())
    if not m:
        return None
    number = re.sub(r"[\s,\u00a0]", "", m.group(1))
    if not number:
        return None
    try:
        return int(float(number) * _MULTIPLIERS[m.group(2).upper()])
    except ValueError:
        return None


def clean_text(value: str | None) -> str | None:
    """Collapse whitespace in short display strings; None-safe."""
    if value is None:
        return None
    out = re.sub(r"\s+", " ", value).strip()
    return out or None
