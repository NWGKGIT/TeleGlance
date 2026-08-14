"""Developer CLI (requires the ``cli`` extra: ``pip install teleglance[cli]``).

Everything prints JSON (or NDJSON for streams) so output pipes cleanly into
``jq`` and friends.
"""

from __future__ import annotations

import asyncio
import sys
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any

from .checkpoints import JsonCheckpointStore, MessageCheckpoint
from .client import TeleGlanceClient
from .errors import DownloadError, TeleGlanceError
from .json import capture_json, dump_json

try:
    import click
except ImportError:  # pragma: no cover - exercised only without the extra
    click = None  # type: ignore[assignment]


def main() -> None:
    if click is None:
        raise SystemExit("The teleglance CLI requires the 'cli' extra: pip install teleglance[cli]")
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

    def _emit(
        value: Any,
        *,
        ndjson: bool = False,
        output: Path | None = None,
        overwrite: bool = False,
    ) -> None:
        try:
            if output is not None:
                capture_json(value, output, ndjson=ndjson, overwrite=overwrite)
            else:
                click.echo(dump_json(value, ndjson=ndjson), nl=False)
                sys.stdout.flush()
        except (FileExistsError, OSError, TypeError) as exc:
            raise click.ClickException(str(exc)) from exc

    async def _checkpoint(
        path: Path,
        key: str,
        channel: str,
    ) -> tuple[JsonCheckpointStore, MessageCheckpoint]:
        store = JsonCheckpointStore(path)
        saved = await store.load(key)
        if saved is not None and saved.channel != channel:
            raise click.ClickException(
                f"checkpoint {key!r} belongs to {saved.channel!r}, not {channel!r}"
            )
        return store, saved or MessageCheckpoint(channel=channel)

    @click.group()
    @click.option(
        "--rate-limit",
        type=click.FloatRange(min=0),
        default=1.0,
        show_default=True,
        help="Max requests/second.",
    )
    @click.option("--retries", type=click.IntRange(min=0), default=3, show_default=True)
    @click.option(
        "--timeout", type=click.FloatRange(min=0, min_open=True), default=15.0, show_default=True
    )
    @click.option("--proxy", type=str, default=None, help="Proxy URL (http:// or socks5://).")
    @click.option("--base-url", type=str, default="https://t.me", show_default=True)
    @click.pass_context
    def cli(
        ctx: click.Context,
        rate_limit: float,
        retries: int,
        timeout: float,
        proxy: str | None,
        base_url: str,
    ) -> None:
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
    @click.option("-o", "--output", type=click.Path(dir_okay=False, path_type=Path), default=None)
    @click.option("--overwrite", is_flag=True, help="Replace an existing output file.")
    @click.pass_obj
    def channel(obj: dict[str, Any], channel: str, output: Path | None, overwrite: bool) -> None:
        """Channel metadata as JSON."""

        async def go(client: TeleGlanceClient) -> None:
            _emit(await client.get_channel(channel), output=output, overwrite=overwrite)

        _run(obj, go)

    @cli.command()
    @click.argument("channel")
    @click.option("--limit", type=click.IntRange(min=0), default=20, show_default=True)
    @click.option(
        "--before",
        type=click.IntRange(min=1),
        default=None,
        help="Only messages with a smaller id.",
    )
    @click.option(
        "--after",
        type=click.IntRange(min=0),
        default=None,
        help="Stream newer messages oldest first.",
    )
    @click.option("--query", type=str, default=None, help="Server-side text search.")
    @click.option("--ndjson", is_flag=True, help="One compact JSON object per line.")
    @click.option("-o", "--output", type=click.Path(dir_okay=False, path_type=Path), default=None)
    @click.option("--overwrite", is_flag=True, help="Replace an existing output file.")
    @click.option("--checkpoint", type=click.Path(dir_okay=False, path_type=Path), default=None)
    @click.option("--checkpoint-key", type=str, default=None)
    @click.pass_obj
    def messages(
        obj: dict[str, Any],
        channel: str,
        limit: int,
        before: int | None,
        after: int | None,
        query: str | None,
        ndjson: bool,
        output: Path | None,
        overwrite: bool,
        checkpoint: Path | None,
        checkpoint_key: str | None,
    ) -> None:
        """Dump history newest first, or updates oldest first with --after."""

        if before is not None and after is not None:
            raise click.UsageError("--before and --after are mutually exclusive")
        if checkpoint is not None and not ndjson:
            raise click.UsageError("--checkpoint requires --ndjson")

        async def go(client: TeleGlanceClient) -> None:
            name = client.normalize_channel(channel)
            direction = "forward" if after is not None else "history"
            key = checkpoint_key or f"messages:{direction}:{name}:{query or ''}"
            store = None
            state = None
            if checkpoint is not None:
                store, state = await _checkpoint(checkpoint, key, name)

            if after is not None:
                forward_cursor = state.newest_id if state and state.newest_id is not None else after
                iterator = client.iter_new_messages(name, after=forward_cursor, limit=limit)
            else:
                history_cursor = (
                    state.oldest_id if state and state.oldest_id is not None else before
                )
                iterator = client.iter_messages(
                    name, limit=limit, before=history_cursor, query=query
                )

            collected = []
            async for message in iterator:
                collected.append(message)
                if store is not None and state is not None:
                    state = state.record(message)
                    await store.save(key, state)
            _emit(collected, ndjson=ndjson, output=output, overwrite=overwrite)

        _run(obj, go)

    @cli.command()
    @click.argument("channel")
    @click.argument("query")
    @click.option("--limit", type=click.IntRange(min=0), default=20, show_default=True)
    @click.option("--ndjson", is_flag=True)
    @click.option("-o", "--output", type=click.Path(dir_okay=False, path_type=Path), default=None)
    @click.option("--overwrite", is_flag=True, help="Replace an existing output file.")
    @click.pass_obj
    def search(
        obj: dict[str, Any],
        channel: str,
        query: str,
        limit: int,
        ndjson: bool,
        output: Path | None,
        overwrite: bool,
    ) -> None:
        """Search within a channel."""

        async def go(client: TeleGlanceClient) -> None:
            collected = []
            async for message in client.search(channel, query, limit=limit):
                collected.append(message)
            _emit(collected, ndjson=ndjson, output=output, overwrite=overwrite)

        _run(obj, go)

    @cli.command()
    @click.argument("channel")
    @click.option(
        "--interval",
        type=click.FloatRange(min=0),
        default=30.0,
        show_default=True,
        help="Poll interval, seconds.",
    )
    @click.option("--since-id", type=click.IntRange(min=0), default=None)
    @click.option("--checkpoint", type=click.Path(dir_okay=False, path_type=Path), default=None)
    @click.option("--checkpoint-key", type=str, default=None)
    @click.option("-o", "--output", type=click.Path(dir_okay=False, path_type=Path), default=None)
    @click.option("--overwrite", is_flag=True, help="Replace an existing output file.")
    @click.pass_obj
    def watch(
        obj: dict[str, Any],
        channel: str,
        interval: float,
        since_id: int | None,
        checkpoint: Path | None,
        checkpoint_key: str | None,
        output: Path | None,
        overwrite: bool,
    ) -> None:
        """Stream new posts as NDJSON until interrupted."""

        async def go(client: TeleGlanceClient) -> None:
            if output is not None:
                _emit([], ndjson=True, output=output, overwrite=overwrite)
            name = client.normalize_channel(channel)
            key = checkpoint_key or f"watch:{name}"
            store = None
            state = None
            since: int | None
            if checkpoint is not None:
                store, state = await _checkpoint(checkpoint, key, name)
                if state.newest_id is not None:
                    since = state.newest_id
                else:
                    since = since_id
            else:
                since = since_id
            async for message in client.watch(name, interval=interval, since_id=since):
                if output is None:
                    _emit(message, ndjson=True)
                else:
                    with output.open("a", encoding="utf-8") as stream:
                        stream.write(dump_json([message], ndjson=True))
                if store is not None and state is not None:
                    state = state.record(message)
                    await store.save(key, state)

        _run(obj, go)

    @cli.command()
    @click.argument("channel")
    @click.argument("msg_id", type=click.IntRange(min=1))
    @click.option(
        "-o", "--output", type=click.Path(file_okay=False), default=".", show_default=True
    )
    @click.option("--overwrite", is_flag=True)
    @click.option("--max-bytes", type=click.IntRange(min=1), default=None)
    @click.pass_obj
    def download(
        obj: dict[str, Any],
        channel: str,
        msg_id: int,
        output: str,
        overwrite: bool,
        max_bytes: int | None,
    ) -> None:
        """Download all media attached to a message."""

        async def go(client: TeleGlanceClient) -> None:
            message = await client.get_message(channel, msg_id)
            if not message.media:
                click.echo("no media on this message", err=True)
                return
            for item in message.media:
                try:
                    path = await client.download_media(
                        item, output, overwrite=overwrite, max_bytes=max_bytes
                    )
                except DownloadError as exc:
                    click.echo(f"skipped {item.type}: {exc}", err=True)
                else:
                    click.echo(str(path))

        _run(obj, go)
