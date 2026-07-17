"""HTTP transport: throttling, retries and hooks on top of httpx.

All requests the library makes go through :class:`Transport`, so polite
behavior (rate limiting, backoff, honest ``Retry-After`` handling) applies
uniformly — including media downloads.

Observability hooks use httpx's native ``event_hooks`` mechanism: pass
``request_hooks`` / ``response_hooks`` (lists of async callables receiving the
``httpx.Request`` / ``httpx.Response``).
"""

from __future__ import annotations

import asyncio
import random
import time
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Any

import httpx

from .errors import RateLimited

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

RequestHook = Callable[[httpx.Request], Awaitable[None]]
ResponseHook = Callable[[httpx.Response], Awaitable[None]]


class Transport:
    def __init__(
        self,
        *,
        rate_limit: float = 1.0,
        retries: int = 3,
        backoff_base: float = 0.5,
        backoff_max: float = 30.0,
        timeout: float = 15.0,
        proxy: str | None = None,
        headers: dict[str, str] | None = None,
        request_hooks: list[RequestHook] | None = None,
        response_hooks: list[ResponseHook] | None = None,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        """
        rate_limit — maximum requests per second (0 disables throttling).
        retries — additional attempts on 429/5xx/transport errors.
        proxy — httpx proxy URL (``http://``, ``socks5://`` with the [socks] extra).
        client — bring your own configured ``httpx.AsyncClient``; the other
            connection options are ignored in that case.
        """
        self._min_interval = 1.0 / rate_limit if rate_limit > 0 else 0.0
        self._retries = max(0, retries)
        self._backoff_base = backoff_base
        self._backoff_max = backoff_max
        self._owns_client = client is None
        self._client = client or httpx.AsyncClient(
            headers={**DEFAULT_HEADERS, **(headers or {})},
            timeout=timeout,
            proxy=proxy,
            follow_redirects=True,
            event_hooks={
                "request": list(request_hooks or []),
                "response": list(response_hooks or []),
            },
        )
        self._lock = asyncio.Lock()
        self._last_request = 0.0

    async def _throttle(self) -> None:
        if not self._min_interval:
            return
        async with self._lock:
            now = time.monotonic()
            wait = self._last_request + self._min_interval - now
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_request = time.monotonic()

    def _backoff_delay(self, attempt: int, retry_after: float | None = None) -> float:
        if retry_after is not None:
            return min(retry_after, self._backoff_max)
        delay = min(self._backoff_base * (2**attempt), self._backoff_max)
        return delay + random.uniform(0, delay / 4)

    @staticmethod
    def _retry_after(response: httpx.Response) -> float | None:
        value = response.headers.get("Retry-After")
        try:
            return float(value) if value is not None else None
        except ValueError:
            return None

    async def get(self, url: str, *, params: dict[str, Any] | None = None) -> httpx.Response:
        """GET with throttling and retries. 4xx other than 429 is returned to
        the caller (page-level errors carry meaning here), 429/5xx are retried."""
        last_exc: Exception | None = None
        for attempt in range(self._retries + 1):
            await self._throttle()
            try:
                response = await self._client.get(url, params=params)
            except httpx.TransportError as exc:
                last_exc = exc
                if attempt == self._retries:
                    raise
                await asyncio.sleep(self._backoff_delay(attempt))
                continue
            if response.status_code == 429:
                retry_after = self._retry_after(response)
                if attempt == self._retries:
                    raise RateLimited(retry_after)
                await asyncio.sleep(self._backoff_delay(attempt, retry_after))
                continue
            if response.status_code >= 500 and attempt < self._retries:
                await asyncio.sleep(self._backoff_delay(attempt))
                continue
            return response
        raise last_exc if last_exc else RateLimited()  # pragma: no cover - unreachable

    @asynccontextmanager
    async def stream(self, url: str) -> AsyncIterator[httpx.Response]:
        """Streaming GET (for media downloads), throttled but not retried —
        callers decide whether a partial download is worth repeating."""
        await self._throttle()
        async with self._client.stream("GET", url) as response:
            yield response

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()
