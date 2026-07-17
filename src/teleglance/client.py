"""The main entry point: :class:`TeleGlanceClient`."""

from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path
from types import TracebackType
from typing import Any

from . import live, media as media_mod
from .errors import ChannelNotFound, ChannelPrivate, MessageNotFound
from .models import Channel, Message
from .models.media import Media
from .parsing import PageKind, classify_page, parse_channel, parse_feed
from .parsing.message import default_registry
from .parsing.registry import ParserRegistry
from .transport import RequestHook, ResponseHook, Transport


class TeleGlanceClient:
    """Async client for public Telegram channels via t.me web previews.

    Usage::

        async with TeleGlanceClient() as client:
            channel = await client.get_channel("telegram")
            async for message in client.iter_messages("telegram", limit=100):
                print(message.id, message.text)
    """

    def __init__(
        self,
        *,
        base_url: str = "https://t.me",
        rate_limit: float = 1.0,
        retries: int = 3,
        timeout: float = 15.0,
        proxy: str | None = None,
        headers: dict[str, str] | None = None,
        request_hooks: list[RequestHook] | None = None,
        response_hooks: list[ResponseHook] | None = None,
        registry: ParserRegistry | None = None,
        transport: Transport | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.registry = registry or default_registry()
        self._transport = transport or Transport(
            rate_limit=rate_limit,
            retries=retries,
            timeout=timeout,
            proxy=proxy,
            headers=headers,
            request_hooks=request_hooks,
            response_hooks=response_hooks,
        )

    # -- lifecycle ----------------------------------------------------------

    async def __aenter__(self) -> TeleGlanceClient:
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._transport.aclose()

    # -- helpers ------------------------------------------------------------

    @staticmethod
    def normalize_channel(channel: str) -> str:
        """Accept ``name``, ``@name``, ``t.me/name``, ``https://t.me/s/name``…"""
        value = channel.strip()
        for prefix in ("https://", "http://"):
            value = value.removeprefix(prefix)
        value = value.removeprefix("t.me/").removeprefix("s/")
        value = value.lstrip("@").strip("/")
        return value.split("/", 1)[0].split("?", 1)[0]

    async def _fetch_feed_page(self, channel: str, params: dict[str, Any]) -> str:
        response = await self._transport.get(f"{self.base_url}/s/{channel}", params=params)
        if response.status_code == 404:
            raise ChannelNotFound(channel)
        html = response.text
        kind = classify_page(html)
        if kind == PageKind.FEED:
            return html
        if kind == PageKind.CARD:
            # /s/ redirected to the plain profile card: exists, but no preview.
            raise ChannelPrivate(channel)
        raise ChannelNotFound(channel)

    # -- channel ------------------------------------------------------------

    async def get_channel(self, channel: str) -> Channel:
        """Channel metadata. Works for preview-less channels too (falls back
        to the profile card, which has fewer fields)."""
        name = self.normalize_channel(channel)
        response = await self._transport.get(f"{self.base_url}/s/{name}")
        if response.status_code == 404:
            raise ChannelNotFound(name)
        parsed = parse_channel(response.text, name)
        if parsed is None:
            raise ChannelNotFound(name)
        return parsed

    # -- messages -----------------------------------------------------------

    async def get_messages(
        self,
        channel: str,
        *,
        before: int | None = None,
        after: int | None = None,
        query: str | None = None,
    ) -> list[Message]:
        """One feed page (about 20 messages), oldest first — the page order.

        before/after — message-id cursors, as used by the t.me feed itself.
        query — server-side text search within the channel.
        """
        name = self.normalize_channel(channel)
        params: dict[str, Any] = {}
        if before is not None:
            params["before"] = before
        if after is not None:
            params["after"] = after
        if query is not None:
            params["q"] = query
        html = await self._fetch_feed_page(name, params)
        return parse_feed(html, self.registry)

    async def iter_messages(
        self,
        channel: str,
        *,
        limit: int | None = None,
        before: int | None = None,
        query: str | None = None,
    ) -> AsyncIterator[Message]:
        """Iterate the channel history newest → oldest, paginating
        transparently (Telethon-style)."""
        yielded = 0
        cursor = before
        while True:
            page = await self.get_messages(channel, before=cursor, query=query)
            if cursor is not None:
                # Guard against overlapping pages / cursor loops: only accept
                # messages strictly older than what we've already yielded.
                page = [m for m in page if m.id < cursor]
            if not page:
                return
            for message in reversed(page):
                yield message
                yielded += 1
                if limit is not None and yielded >= limit:
                    return
            cursor = min(m.id for m in page)

    async def get_message(self, channel: str, msg_id: int) -> Message:
        """A single message, via the t.me embed endpoint."""
        name = self.normalize_channel(channel)
        response = await self._transport.get(
            f"{self.base_url}/{name}/{msg_id}", params={"embed": "1", "mode": "tme"}
        )
        if response.status_code == 404:
            raise MessageNotFound(name, msg_id)
        messages = parse_feed(response.text, self.registry)
        for message in messages:
            if message.id == msg_id:
                return message
        raise MessageNotFound(name, msg_id)

    def search(
        self, channel: str, query: str, *, limit: int | None = None
    ) -> AsyncIterator[Message]:
        """Server-side text search, newest → oldest."""
        return self.iter_messages(channel, limit=limit, query=query)

    def watch(
        self,
        channel: str,
        *,
        interval: float = 30.0,
        since_id: int | None = None,
    ) -> AsyncIterator[Message]:
        """Poll for new posts and yield them as they appear (oldest first)."""
        return live.watch(
            self, self.normalize_channel(channel), interval=interval, since_id=since_id
        )

    # -- media --------------------------------------------------------------

    async def download_media(
        self,
        media: Media | str,
        dest: str | Path | None = None,
        *,
        filename: str | None = None,
    ) -> Path:
        """Download a media attachment (or raw URL) to disk; returns the path."""
        return await media_mod.download_media(self._transport, media, dest, filename=filename)

    async def download_bytes(self, media: Media | str) -> bytes:
        return await media_mod.download_bytes(self._transport, media)
