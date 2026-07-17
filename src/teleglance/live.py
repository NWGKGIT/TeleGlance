"""Live polling: yield new messages as they are posted.

t.me previews have no push channel, so this is polite polling of the feed's
``?after=<id>`` cursor. Transient failures (rate limiting that survived
retries, network hiccups, parse breakage) are logged and retried on the next
tick; genuinely fatal states (channel gone or made private) propagate.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING

import httpx

from .errors import ParseError, RateLimited
from .models import Message

if TYPE_CHECKING:
    from .client import TeleGlanceClient

logger = logging.getLogger("teleglance")


async def watch(
    client: TeleGlanceClient,
    channel: str,
    *,
    interval: float = 30.0,
    since_id: int | None = None,
) -> AsyncIterator[Message]:
    """Async-iterate over new messages, oldest first.

    since_id — only yield messages with a bigger id; defaults to the newest
    message at the time the watcher starts (i.e. only future posts).
    """
    if since_id is None:
        page = await client.get_messages(channel)
        since_id = max((m.id for m in page), default=0)

    while True:
        await asyncio.sleep(interval)
        try:
            fresh = await client.get_messages(channel, after=since_id)
        except (RateLimited, ParseError, httpx.TransportError) as exc:
            logger.warning("watch(%s): poll failed, will retry: %s", channel, exc)
            continue
        for message in sorted(fresh, key=lambda m: m.id):
            if message.id > since_id:
                since_id = message.id
                yield message
