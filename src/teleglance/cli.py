"""Developer CLI (requires the ``cli`` extra: ``pip install teleglance[cli]``).

Everything prints JSON (or NDJSON for streams) so output pipes cleanly into
``jq`` and friends.
"""

from __future__ import annotations

import asyncio
import sys
from collections.abc import Awaitable, Callable
from typing import Any

from .client import TeleGlanceClient
from .errors import DownloadError, TeleGlanceError

try:
    import click
except ImportError:  # pragma: no cover - exercised only without the extra
    click = None  # type: ignore[assignment]


def main() -> None:
    if click is None:
        raise SystemExit(
            "The teleglance CLI requires the 'cli' extra: pip install teleglance[cli]"
        )
    cli(prog_name="teleglance")


if click is not None:

    def _run(obj: dict[str, Any], fn: Callable[[TeleGlanceClient], Awaitable[None]]) -> None:
        async def runner() -> None:
            async with TeleGlanceClient(**obj) as client:
                await fn(client)

        try:
            asyncio.run(runner())
        except TeleGlanceError as exc:
            raise click.ClickException(str(exc)) from exc

    def _emit(model: Any, ndjson: bool) -> None:
        indent = None if ndjson else 2
        click.echo(model.model_dump_json(indent=indent))
        sys.stdout.flush()

    @click.group()
    @click.option("--rate-limit", type=float, default=1.0, show_default=True, help="Max requests/second.")
    @click.option("--retries", type=int, default=3, show_default=True)
    @click.option("--timeout", type=float, default=15.0, show_default=True)
    @click.option("--proxy", type=str, default=None, help="Proxy URL (http:// or socks5://).")
    @click.option("--base-url", type=str, default="https://t.me", show_default=True)
    @click.pass_context
    def cli(ctx: click.Context, rate_limit: float, retries: int, timeout: float, proxy: str | None, base_url: str) -> None:
        """Inspect public Telegram channels through t.me web previews."""
        ctx.obj = {
            "rate_limit": rate_limit,
            "retries": retries,
            "timeout": timeout,
            "proxy": proxy,
            "base_url": base_url,
        }

    @cli.command()
    @click.argument("channel")
    @click.pass_obj
    def channel(obj: dict[str, Any], channel: str) -> None:
        """Channel metadata as JSON."""

        async def go(client: TeleGlanceClient) -> None:
            _emit(await client.get_channel(channel), ndjson=False)

        _run(obj, go)

    @cli.command()
    @click.argument("channel")
    @click.option("--limit", type=int, default=20, show_default=True)
    @click.option("--before", type=int, default=None, help="Only messages with a smaller id.")
    @click.option("--query", type=str, default=None, help="Server-side text search.")
    @click.option("--ndjson", is_flag=True, help="One compact JSON object per line.")
    @click.pass_obj
    def messages(obj: dict[str, Any], channel: str, limit: int, before: int | None, query: str | None, ndjson: bool) -> None:
        """Dump message history, newest first."""

        async def go(client: TeleGlanceClient) -> None:
            async for message in client.iter_messages(channel, limit=limit, before=before, query=query):
                _emit(message, ndjson)

        _run(obj, go)

    @cli.command()
    @click.argument("channel")
    @click.argument("query")
    @click.option("--limit", type=int, default=20, show_default=True)
    @click.option("--ndjson", is_flag=True)
    @click.pass_obj
    def search(obj: dict[str, Any], channel: str, query: str, limit: int, ndjson: bool) -> None:
        """Search within a channel."""

        async def go(client: TeleGlanceClient) -> None:
            async for message in client.search(channel, query, limit=limit):
                _emit(message, ndjson)

        _run(obj, go)

    @cli.command()
    @click.argument("channel")
    @click.option("--interval", type=float, default=30.0, show_default=True, help="Poll interval, seconds.")
    @click.pass_obj
    def watch(obj: dict[str, Any], channel: str, interval: float) -> None:
        """Stream new posts as NDJSON until interrupted."""

        async def go(client: TeleGlanceClient) -> None:
            async for message in client.watch(channel, interval=interval):
                _emit(message, ndjson=True)

        _run(obj, go)

    @cli.command()
    @click.argument("channel")
    @click.argument("msg_id", type=int)
    @click.option("-o", "--output", type=click.Path(file_okay=False), default=".", show_default=True)
    @click.pass_obj
    def download(obj: dict[str, Any], channel: str, msg_id: int, output: str) -> None:
        """Download all media attached to a message."""

        async def go(client: TeleGlanceClient) -> None:
            message = await client.get_message(channel, msg_id)
            if not message.media:
                click.echo("no media on this message", err=True)
                return
            for item in message.media:
                try:
                    path = await client.download_media(item, output)
                except DownloadError as exc:
                    click.echo(f"skipped {item.type}: {exc}", err=True)
                else:
                    click.echo(str(path))

        _run(obj, go)
