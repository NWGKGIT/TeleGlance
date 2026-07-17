"""Async media downloading."""

from __future__ import annotations

import mimetypes
from pathlib import Path
from urllib.parse import urlparse

from .errors import DownloadError
from .models.media import Media
from .transport import Transport


def resolve_url(media: Media | str) -> str:
    """Best downloadable URL for a media object, or raise DownloadError."""
    if isinstance(media, str):
        return media
    url = getattr(media, "url", None)
    if url:
        return url
    kind = getattr(media, "type", type(media).__name__)
    if kind == "document":
        raise DownloadError(
            "t.me previews do not expose direct URLs for document attachments"
        )
    raise DownloadError(f"{kind} media has no downloadable URL")


def _filename_for(url: str, content_type: str | None) -> str:
    name = Path(urlparse(url).path).name
    if name and "." in name:
        return name
    ext = mimetypes.guess_extension((content_type or "").split(";")[0].strip()) or ".bin"
    return (name or "media") + ext


async def download_bytes(transport: Transport, media: Media | str) -> bytes:
    url = resolve_url(media)
    async with transport.stream(url) as response:
        if response.status_code != 200:
            raise DownloadError(f"GET {url} returned {response.status_code}")
        return await response.aread()


async def download_media(
    transport: Transport,
    media: Media | str,
    dest: str | Path | None = None,
    *,
    filename: str | None = None,
) -> Path:
    """Download to disk. ``dest`` may be a directory (filename derived from the
    URL / content type) or a full file path. Defaults to the current directory."""
    url = resolve_url(media)
    async with transport.stream(url) as response:
        if response.status_code != 200:
            raise DownloadError(f"GET {url} returned {response.status_code}")

        dest_path = Path(dest) if dest is not None else Path.cwd()
        if dest_path.suffix and not dest_path.is_dir():
            target = dest_path
        else:
            dest_path.mkdir(parents=True, exist_ok=True)
            content_type = response.headers.get("Content-Type")
            target = dest_path / (filename or _filename_for(url, content_type))

        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("wb") as fh:
            async for chunk in response.aiter_bytes():
                fh.write(chunk)
    return target
