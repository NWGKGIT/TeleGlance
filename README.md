# TeleGlance

Async Python client for public Telegram channels built entirely on t.me web previews. No API keys, no MTProto, no user account required.

---

## Overview

TeleGlance is an async Python client for accessing public Telegram channels without Telegram API credentials. By using public t.me web previews instead of the MTProto protocol, it allows applications to collect public channel data instantly without authentication.

### What TeleGlance Provides
* Public channel metadata
* Message history and pagination
* Channel search
* Live polling
* Media downloading
* Resumable checkpoints
* SOCKS proxy support
* Request and response hooks
* CLI access

---

## Why TeleGlance?

TeleGlance is not a replacement for Telethon. It provides a deliberately smaller interface for applications that only need publicly accessible channel data and do not want Telegram API credentials or an MTProto session.

| Capability | TeleGlance | Telethon |
| :--- | :--- | :--- |
| Telegram API credentials | No | Yes |
| MTProto | No | Yes |
| Public channels | Yes | Yes |
| Private channels | No | Yes |
| Full Telegram API | No | Yes |
| Web-preview based | Yes | No |
| Account/session required | No | Generally |
| Sending/interacting | No | Yes |

---

## What TeleGlance Can and Cannot Do

* **Can Do**: Retrieve public posts, titles, descriptions, participant counts, photos, videos, voice notes, stickers, and search results. It supports connection pooling, retries, and checkpointing.
* **Cannot Do**: Access private channels, send messages, authenticate as a user, join chat sessions, retrieve deep history beyond the web preview limit, or download document attachments (Telegram does not expose document download URLs on web previews).

---

## Installation

Install using pip:

```bash
pip install teleglance
```

Or using uv:

```bash
uv add teleglance
```

### Extras
* **CLI Utility**: `pip install "teleglance[cli]"` or `uv add "teleglance[cli]"`
* **SOCKS Proxy Support**: `pip install "teleglance[socks]"` or `uv add "teleglance[socks]"`

Supports Python 3.10 through 3.14. Refer to the complete installation documentation at https://NWGKGIT.github.io/TeleGlance/ for configuration options.

---

## Quick Start

The following example demonstrates how to retrieve metadata and iterate recent posts from the example channel, `nahomssandbox`:

```python
import asyncio
from teleglance import TeleGlanceClient


async def main():
    async with TeleGlanceClient() as client:
        # Fetch channel metadata
        channel = await client.get_channel("nahomssandbox")
        print(f"Title: {channel.title}")
        print(f"Subscribers count: {channel.counts.subscribers}")

        # Iterate the last 10 messages
        async for message in client.iter_messages("nahomssandbox", limit=10):
            print(f"[{message.id}] ({message.date}): {message.text[:80]}")


asyncio.run(main())
```

### Returned Objects
* `get_channel` returns a `Channel` model containing titles, descriptions, avatars, and counts.
* `iter_messages` yields `Message` models containing text, timestamps, views, entities, and attached media lists.

---

## API Overview

```text
TeleGlanceClient
├── get_channel()       Channel metadata
├── get_message()       Individual messages
├── iter_messages()     Historical messages
├── search()            Channel search
├── watch()             New-message polling
├── download_media()    Save media to disk
└── download_bytes()    Download media to memory
```

For the exhaustive API reference, check the complete documentation site at https://NWGKGIT.github.io/TeleGlance/.

---

## Examples

### Channel Metadata
Retrieve metadata details for the example channel:
```python
channel = await client.get_channel("nahomssandbox")
print(channel.title, channel.description)
```

### Message History
Paginate through past message history using the `before` cursor:
```python
async for message in client.iter_messages("nahomssandbox", limit=5, before=1060):
    print(message.id, message.text)
```

### Single Message
Lookup a single post by its unique ID:
```python
message = await client.get_message("nahomssandbox", 1061)
print(message.text)
```

### Search
Perform text queries within a channel's history:
```python
async for message in client.search("nahomssandbox", "react", limit=5):
    print(message.id, message.text)
```

### Live Monitoring
Poll for new posts. This runs in near-real-time using polling, not push updates.
```python
async for message in client.watch("nahomssandbox", interval=10.0):
    print(f"New post: {message.text}")
```
*Note: Transient errors are logged as warnings and retried, while fatal errors (e.g. channel private) bubble up.*

### Media
Save attachments to disk or download them in-memory:
```python
# Save to disk
path = await client.download_media(message.media[0], dest="./downloads")

# In-memory download
data = await client.download_bytes(message.media[0])
```
*Note: Document downloads are not supported on web previews. Check the media guides at https://NWGKGIT.github.io/TeleGlance/ for details.*

### Resumable Collection
Perform history collection with checkpoint states:
```python
store = JsonCheckpointStore("state.json")
state = await store.load("history:nahomssandbox") or MessageCheckpoint(channel="nahomssandbox")

async for message in client.iter_messages("nahomssandbox", before=state.oldest_id):
    await process(message)
    state = state.record(message)
    await store.save("history:nahomssandbox", state)
```

---

## Data Model

* **`Channel`**: Channel information (title, description, raw counters).
* **`Message`**: Post metadata (ID, date, text, views, list of media).
* **`Media`**: Photo, Video, Sticker, Poll, and Location structures.
* **`MessageCheckpoint` / `JsonCheckpointStore`**: Resumable scraper state structures.

---

## Limitations

* **Public Channels Only**: Private channels raise `ChannelPrivate`.
* **Approximate Counters**: View and subscriber numbers are strings (e.g., `1.2K`).
* **History Depth**: Telegram caps web preview depth to recent posts (usually ~100 to ~2,000).
* **Media Limits**: Documents cannot be downloaded.
* **Markup Dependencies**: Changes in Telegram's web preview layout may impact parsing accuracy.

---

## Architecture

TeleGlance splits network transport and data presentation into two components:
1. **`TeleGlanceClient`**: Normalizes inputs, runs the parsers, and handles paginators.
2. **`Transport`**: Manages HTTP connections, throttling (polite request pacing), retries, proxies, and observability event hooks.

```
       +---------------------------------------------+
       |             TeleGlanceClient                |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |                 Transport                   |
       +---------------------------------------------+
```

---

## Markup Resilience

If Telegram alters its CSS structure, overrides can be supplied dynamically without updating the library:
1. **Selector Overrides**: Replace specific CSS classes at runtime.
2. **Parser Registry**: Map custom parser routines to new element structures.
3. **Raw HTML Fallback**: Each message preserves its original markup under `Message.raw_html`.

---

## CLI

```bash
# Get channel metadata
teleglance channel nahomssandbox

# Retrieve recent messages in NDJSON format
teleglance messages nahomssandbox --limit 10 --ndjson

# Download media files from a post
teleglance download nahomssandbox 1062 -o downloads/
```

See the CLI guides at https://NWGKGIT.github.io/TeleGlance/ for options.

---

## Development

Execute tests and code style checks:

```bash
uv sync --all-extras --group dev

uv run ruff check .
uv run ruff format --check .
uv run mypy

uv run pytest --cov
```

Refer to the development guides at https://NWGKGIT.github.io/TeleGlance/ for fixture recording instructions.

---

## Documentation

The complete documentation, including full guides and API reference, is available at:
https://NWGKGIT.github.io/TeleGlance/

---

## License

This project is licensed under the MIT License.
