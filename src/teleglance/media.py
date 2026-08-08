"""Async media downloading."""

from __future__ import annotations

import mimetypes
import os
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from .errors import DownloadError
from .models.media import Media
from .transport import TransportProtocol


def resolve_url(media: Media | str) -> str:
    """Best downloadable URL for a media object, or raise DownloadError."""
    if isinstance(media, str):
        return media
    url = getattr(media, "url", None)
    if isinstance(url, str) and url:
        return url
    kind = getattr(media, "type", type(media).__name__)
    if kind == "document":
        raise DownloadError("t.me previews do not expose direct URLs for document attachments")
    raise DownloadError(f"{kind} media has no downloadable URL")


def _filename_for(url: str, content_type: str | None) -> str:
    name = Path(urlparse(url).path).name
    if name and "." in name:
        return name
    ext = mimetypes.guess_extension((content_type or "").split(";")[0].strip()) or ".bin"
    return (name or "media") + ext


def _validate_max_bytes(max_bytes: int | None) -> None:
    if max_bytes is not None and max_bytes <= 0:
        raise ValueError("max_bytes must be positive")


def _declared_too_large(content_length: str | None, max_bytes: int | None) -> bool:
    if content_length is None or max_bytes is None:
        return False
    try:
        return int(content_length) > max_bytes
    except ValueError:
        return False


async def download_bytes(
    transport: TransportProtocol,
    media: Media | str,
    *,
    max_bytes: int | None = None,
) -> bytes:
    _validate_max_bytes(max_bytes)
    url = resolve_url(media)
    async with transport.stream(url) as response:
        if response.status_code != 200:
            raise DownloadError(f"GET {url} returned {response.status_code}")
        if _declared_too_large(response.headers.get("Content-Length"), max_bytes):
            raise DownloadError(f"download exceeds max_bytes={max_bytes}")
        chunks = []
        size = 0
        async for chunk in response.aiter_bytes():
            size += len(chunk)
            if max_bytes is not None and size > max_bytes:
                raise DownloadError(f"download exceeds max_bytes={max_bytes}")
            chunks.append(chunk)
        return b"".join(chunks)


async def download_media(
    transport: TransportProtocol,
    media: Media | str,
    dest: str | Path | None = None,
    *,
    filename: str | None = None,
    overwrite: bool = False,
    max_bytes: int | None = None,
) -> Path:
    """Download to disk. ``dest`` may be a directory (filename derived from the
    URL / content type) or a full file path. Defaults to the current directory."""
    _validate_max_bytes(max_bytes)
    url = resolve_url(media)
    async with transport.stream(url) as response:
        if response.status_code != 200:
            raise DownloadError(f"GET {url} returned {response.status_code}")

        if _declared_too_large(response.headers.get("Content-Length"), max_bytes):
            raise DownloadError(f"download exceeds max_bytes={max_bytes}")

        dest_path = Path(dest) if dest is not None else Path.cwd()
        if dest_path.suffix and not dest_path.is_dir():
            target = dest_path
        else:
            dest_path.mkdir(parents=True, exist_ok=True)
            content_type = response.headers.get("Content-Type")
            safe_filename = Path(filename).name if filename else _filename_for(url, content_type)
            target = dest_path / safe_filename

        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists() and not overwrite:
            raise DownloadError(f"destination already exists: {target}")
        temporary_path: Path | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="wb", dir=target.parent, prefix=f".{target.name}.", delete=False
            ) as fh:
                temporary_path = Path(fh.name)
                size = 0
                async for chunk in response.aiter_bytes():
                    size += len(chunk)
                    if max_bytes is not None and size > max_bytes:
                        raise DownloadError(f"download exceeds max_bytes={max_bytes}")
                    fh.write(chunk)
                fh.flush()
                os.fsync(fh.fileno())
            if target.exists() and not overwrite:
                raise DownloadError(f"destination already exists: {target}")
            temporary_path.replace(target)
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)
    return target
