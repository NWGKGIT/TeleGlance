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

## Features

- **History** — `get_messages()` (one page), `iter_messages()` (transparent pagination, newest → oldest, `limit=`/`before=`)
- **Single message** — `get_message(channel, id)` via the t.me embed endpoint
- **Search** — `search(channel, query)` using t.me's server-side `?q=`
- **Live** — `watch(channel, interval=30)` async-iterates new posts as they appear
- **Channel metadata** — title, description, avatar, subscriber/photo/video/file/link counts
- **Rich messages** — plain text, original HTML, lossy markdown, typed entities (bold/italic/links/mentions/hashtags/spoilers/code/emoji), forward and reply headers, view counts
- **Media** — photos, videos, round videos, voice notes, stickers, polls, link previews, locations, documents; `download_media()` / `download_bytes()` for anything with a direct URL
- **Polite by default** — request throttling (1 req/s), exponential backoff with `Retry-After` handling, typed `RateLimited`
- **Pluggable** — pydantic v2 models (`.model_dump_json()` everywhere), httpx `request_hooks`/`response_hooks`, proxy support, and a parser registry for extending without forking

## CLI

```bash
teleglance channel telegram                     # metadata as JSON
teleglance messages telegram --limit 50 --ndjson | jq .text
teleglance search telegram "premium" --limit 10
teleglance watch telegram --interval 20         # stream new posts as NDJSON
teleglance download telegram 4820 -o downloads/
```

## Extending the parsers

Media blocks are parsed by a registry you can amend — useful when Telegram
ships a block type the library doesn't know yet:

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
never breaks the rest of the message. Every `Message` also keeps `raw_html`,
so nothing the parsers miss is ever lost.

## Limitations (inherent to web previews)

- Public channels only; private channels raise `ChannelPrivate`.
- Feed pages hold ~20 messages; deep history means many requests — keep the rate limit polite.
- Documents expose title/size but **no direct download URL**.
- View counts and subscriber counts are the display values ("1.2K") — parsed integers are approximate; the raw strings are always kept.
- Telegram can change the preview markup at any time. Parsers degrade gracefully (fields become `None`, unknown blocks are skipped, `raw_html` survives), and the test suite runs offline against fixtures in `tests/fixtures/`. To check the fixtures against the live site, record real pages with `uv run scripts/record_fixtures.py <channel>` from a machine that can reach t.me.

## Development

```bash
uv sync --all-extras
uv run pytest
```
