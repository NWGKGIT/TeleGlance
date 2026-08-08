# TeleGlance

Async Python client for **public Telegram channels** built entirely on **t.me web previews** — no API keys, no MTProto, no account. Telethon-flavored ergonomics over `t.me/s/<channel>`.

```python
import asyncio
from teleglance import TeleGlanceClient


async def main():
    async with TeleGlanceClient() as client:
        channel = await client.get_channel("telegram")
        print(channel.title, channel.counts.subscribers)

        async for message in client.iter_messages("telegram", limit=50):
            print(message.id, message.date, message.views, message.text[:80])


asyncio.run(main())
```

## Install

```bash
uv add teleglance            # library
uv add "teleglance[cli]"     # + the `teleglance` command
uv add "teleglance[socks]"   # + SOCKS proxy support
```

TeleGlance supports Python 3.10 through 3.14.

## Features

- **History** — `get_messages()` (one page), `iter_messages()` (transparent pagination, newest → oldest, `limit=`/`before=`)
- **Single message** — `get_message(channel, id)` via the t.me embed endpoint
- **Search** — `search(channel, query)` using t.me's server-side `?q=`
- **Live** — `watch(channel, interval=30)` async-iterates new posts as they appear
- **Resumable** — explicit history/live cursors plus atomic JSON checkpoints
- **Channel metadata** — title, description, avatar, subscriber/photo/video/file/link counts
- **Rich messages** — plain text, original HTML, lossy markdown, typed entities (bold/italic/links/mentions/hashtags/spoilers/code/emoji), forward/reply headers, reactions, comments, edit state, and view counts
- **Media** — photos, videos, round videos, voice notes, stickers, polls, link previews, locations, documents; `download_media()` / `download_bytes()` for anything with a direct URL
- **Polite by default** — request throttling (1 req/s), exponential backoff with `Retry-After` handling, typed `RateLimited`
- **Pluggable** — pydantic v2 models (`.model_dump_json()` everywhere), httpx `request_hooks`/`response_hooks`, proxy support, and a parser registry for extending without forking

## CLI

```bash
teleglance channel telegram                     # metadata as JSON
teleglance messages telegram --limit 50 --ndjson | jq .text
teleglance messages telegram --after 4800 --ndjson --checkpoint state.json
teleglance search telegram "premium" --limit 10
teleglance watch telegram --interval 20 --checkpoint state.json
teleglance download telegram 4820 -o downloads/
```

Collection commands emit one valid JSON array by default. Use `--ndjson` for
streaming or resumable collection. Checkpoints are saved only after each record
has been written and flushed, giving at-least-once delivery: after a crash the
last record may repeat, but it is not silently skipped. Consumers should
deduplicate on `(channel, id)`.

The same behavior is available to library consumers without coupling message
processing to storage:

```python
from teleglance import JsonCheckpointStore, MessageCheckpoint, TeleGlanceClient

store = JsonCheckpointStore("state.json")
state = await store.load("history:telegram") or MessageCheckpoint(channel="telegram")

async with TeleGlanceClient() as client:
    async for message in client.iter_messages("telegram", before=state.oldest_id):
        await process(message)
        state = state.record(message)  # acknowledge only after processing
        await store.save("history:telegram", state)
```

For forward collection, pass `state.newest_id or 0` to
`iter_new_messages(..., after=...)`. Checkpoint stores are a protocol, so an
application can substitute Redis or a database without changing collection
logic. The included JSON store is intended for a single writer.

## Built for markup drift

Telegram can change the preview markup at any time, so adapting must never
require re-architecting. Three layers, cheapest first:

**1. Selectors — every structural assumption in one place.** No parser
hard-codes a t.me class name; they all read from a `Selectors` object
(`src/teleglance/parsing/selectors.py`). If Telegram renames a class, fix it
at runtime without waiting for a release:

```python
from teleglance import DEFAULT_SELECTORS, TeleGlanceClient

selectors = DEFAULT_SELECTORS.replace(views=".tgme_widget_message_view_count")
client = TeleGlanceClient(selectors=selectors)
```

or load overrides from config, so selector fixes ship as data:

```python
from teleglance import Selectors

selectors = Selectors.from_dict(json.load(open("selectors.json")))  # typos raise
```

As maintainer, the permanent fix is editing the defaults in `selectors.py` —
one file, no logic changes.

**2. Parser registry — for new block types.** Media blocks are parsed by a
registry you can amend when Telegram ships something the library doesn't know
yet:

```python
from teleglance import TeleGlanceClient, Unsupported, default_registry

registry = default_registry()


def parse_gift(message_node):
    block = message_node.css_first(".tgme_widget_message_gift")
    return [Unsupported(raw_html=block.html)] if block else []


registry.register("gift", parse_gift)
client = TeleGlanceClient(registry=registry)
```

A parser that raises is logged and skipped — markup drift in one block type
never breaks the rest of the message.

**3. `raw_html` — the safety net.** Every `Message` keeps the full original
HTML of its node, so nothing the parsers miss is ever lost; you can always
post-process what a drifted selector failed to extract.

Set `TeleGlanceClient(strict_parsing=True)` when silent degradation is not
acceptable. A recognized feed containing message containers but no valid post
IDs then raises `ParseError`; genuinely empty feeds remain valid.

When drift happens: record the live page (`uv run scripts/record_fixtures.py
<channel>`), diff it against `tests/fixtures/`, adjust `selectors.py`, update
the fixture, and the test suite validates the fix offline.

## Will Telegram block this?

t.me previews are deliberately public: server-rendered static HTML, no
JavaScript challenge, no Cloudflare, no login. Enforcement is soft, IP-based
rate limiting that only bites at high volume (thousands of requests). The
defaults here — 1 req/s throttling, browser-like headers, backoff honoring
`Retry-After`, and proxy support for scale — stay comfortably under it, so a
headless browser is unnecessary weight. If Telegram ever hardens the
endpoint, the fetching side is an isolated seam: parsers consume plain HTML
strings, and `TeleGlanceClient(transport=...)` accepts any object with the
`Transport` interface, so a browser-based fetcher (Playwright etc.) could be
dropped in without touching a single parser.

## Limitations (inherent to web previews)

- Public channels only; private channels raise `ChannelPrivate`.
- Feed pages hold ~20 messages; deep history means many requests — keep the rate limit polite.
- Documents expose title/size but **no direct download URL**.
- View counts and subscriber counts are the display values ("1.2K") — parsed integers are approximate; the raw strings are always kept.
- History depth via previews is capped by Telegram (reports range from ~100 to ~2000 messages per channel depending on the channel); deeper archives need account-based access, which is out of scope by design.
- Checkpointed delivery is at least once and JSON checkpoint files support one writer; deduplicate downstream by `(channel, id)`.
- Telegram can change the preview markup at any time. Parsers degrade gracefully (fields become `None`, unknown blocks are skipped, `raw_html` survives) — see [Built for markup drift](#built-for-markup-drift) for how to adapt.

## Development

```bash
uv sync --all-extras --group dev
uv run ruff check .
uv run ruff format --check .
uv run mypy
uv run pytest --cov
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for fixture and live-drift workflows.
