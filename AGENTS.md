# TeleGlance for AI Agents

TeleGlance is designed to be agent-friendly. This guide helps AI agents integrate TeleGlance into their workflows.

---

## What TeleGlance does

TeleGlance scrapes public Telegram channel data from `t.me` web previews. It requires **no API keys, no Telegram account, and no authentication**. Just install and start reading.

**Available in two languages:**
- Python 3.10+ (`pip install teleglance`)
- TypeScript/Node.js 18+ (`npm install teleglance`)

Both packages expose identical APIs and produce compatible JSON output.

---

## Core capabilities

| Feature | Description |
|---------|-------------|
| **Channel metadata** | Get title, description, subscriber count, profile photo URL |
| **Message history** | Paginate through channel posts (newest-first or oldest-first) |
| **Search** | Query messages by keyword with pagination |
| **Live watching** | Poll for new messages in real-time with automatic retry on transient failures |
| **Media downloads** | Download photos, videos, stickers, documents to disk or memory |
| **Checkpoints** | Resume streams without reprocessing (file-based or custom storage) |
| **JSON export** | Serialize all data to JSON/NDJSON for storage or inter-process communication |
| **CLI tools** | Command-line interfaces for quick data export and automation |

---

## Quick start

### Python

```python
import asyncio
from teleglance import TeleGlanceClient

async def main():
    async with TeleGlanceClient() as client:
        # Get channel info
        channel = await client.get_channel("telegram")
        print(f"{channel.title}: {channel.counts.subscribers} subscribers")
        
        # Fetch recent messages
        async for message in client.iter_messages("telegram", limit=10):
            print(f"[{message.id}] {message.date}: {message.text[:100]}")

asyncio.run(main())
```

### TypeScript

```typescript
import { TeleGlanceClient } from 'teleglance';

const client = new TeleGlanceClient();

try {
  // Get channel info
  const channel = await client.getChannel('telegram');
  console.log(`${channel.title}: ${channel.counts.subscribers} subscribers`);
  
  // Fetch recent messages
  for await (const message of client.iterMessages('telegram', { limit: 10 })) {
    console.log(`[${message.id}] ${message.date}: ${message.text.slice(0, 100)}`);
  }
} finally {
  await client.close();
}
```

---

## Common agent workflows

### 1. Monitor channels for new content

Use the live watcher to poll for new messages and trigger actions when posts arrive.

**Python:**
```python
async for message in client.watch("breaking_news", interval=30.0):
    print(f"New post: {message.text}")
    # Trigger notification, webhook, or downstream processing
```

**TypeScript:**
```typescript
import { watch } from 'teleglance';

for await (const message of watch(client, 'breaking_news', 30000)) {
  console.log(`New post: ${message.text}`);
  // Trigger notification, webhook, or downstream processing
}
```

### 2. Archive channel history

Fetch all messages from a channel and save to JSON.

**Python:**
```python
from teleglance import capture_json

messages = []
async for msg in client.iter_messages("archives", limit=1000):
    messages.append(msg)

capture_json(messages, "archive.json")
```

**TypeScript:**
```typescript
import { captureJson } from 'teleglance';

const messages = [];
for await (const msg of client.iterMessages('archives', { limit: 1000 })) {
  messages.push(msg);
}

await captureJson(messages, 'archive.json');
```

### 3. Search and extract

Search for specific keywords across a channel's history.

**Python:**
```python
results = []
async for message in client.search("python", "async", limit=50):
    results.append({
        "id": message.id,
        "date": message.date.isoformat() if message.date else None,
        "text": message.text,
        "url": message.url,
    })
```

**TypeScript:**
```typescript
const results = [];
for await (const message of client.search('python', 'async', { limit: 50 })) {
  results.push({
    id: message.id,
    date: message.date?.toISOString(),
    text: message.text,
    url: message.url,
  });
}
```

### 4. Resume from checkpoints

Track your position in a stream so you can resume without reprocessing.

**Python:**
```python
from teleglance import JsonCheckpointStore, CheckpointState

store = JsonCheckpointStore("state.json")
state = await store.load("stream:news")

after_id = state.newest_id if state else None

async for message in client.iter_new_messages("news", after=after_id):
    process(message)
    
    if state is None:
        state = CheckpointState(channel="news", oldest_id=message.id, newest_id=message.id)
    else:
        state = state.record(message)
    
    await store.save("stream:news", state)
```

**TypeScript:**
```typescript
import { JsonCheckpointStore, CheckpointState } from 'teleglance';

const store = new JsonCheckpointStore('state.json');
let state = await store.load('stream:news');

const afterId = state?.newestId;

for await (const message of client.iterNewMessages('news', { after: afterId })) {
  process(message);
  
  if (!state) {
    state = new CheckpointState('news', message.id, message.id);
  } else {
    state = state.record(message);
  }
  
  await store.save('stream:news', state);
}
```

### 5. Download media attachments

Save photos, videos, and documents from messages.

**Python:**
```python
async for message in client.iter_messages("photos", limit=20):
    if message.media:
        for item in message.media:
            path = await client.download_media(item, "./downloads")
            print(f"Downloaded: {path}")
```

**TypeScript:**
```typescript
import { downloadMedia } from 'teleglance';

for await (const message of client.iterMessages('photos', { limit: 20 })) {
  if (message.media) {
    for (const item of message.media) {
      const path = await downloadMedia(item, './downloads');
      console.log(`Downloaded: ${path}`);
    }
  }
}
```

---

## CLI usage

Both packages include command-line tools for quick data export.

### Fetch channel metadata
```bash
teleglance channel telegram --output channel.json
```

### Export message history
```bash
teleglance messages telegram --limit 100 --output messages.json
```

### Search and export
```bash
teleglance search telegram "release" --limit 50 --output search.json
```

### Watch for new messages
```bash
teleglance watch telegram --interval 30 --output watch.ndjson
```

---

## Error handling

TeleGlance raises specific exceptions for common error cases:

- `ChannelNotFound` – Channel doesn't exist
- `ChannelPrivate` – Channel exists but has no public preview
- `MessageNotFound` – Specific message ID not found
- `RateLimited` – Hit Telegram's rate limits (automatically retried)
- `ParseError` – Markup changed and parser failed
- `DownloadError` – Media download failed or exceeded size limit

**Python example:**
```python
from teleglance import ChannelNotFound, ChannelPrivate

try:
    channel = await client.get_channel("private_channel")
except ChannelNotFound:
    print("Channel does not exist")
except ChannelPrivate:
    print("Channel is private")
```

**TypeScript example:**
```typescript
import { ChannelNotFound, ChannelPrivate } from 'teleglance';

try {
  const channel = await client.getChannel('private_channel');
} catch (err) {
  if (err instanceof ChannelNotFound) {
    console.log('Channel does not exist');
  } else if (err instanceof ChannelPrivate) {
    console.log('Channel is private');
  }
}
```

---

## Rate limiting and best practices

1. **Default rate limit**: 1 request per second (configurable)
2. **Polling interval**: Use 30+ seconds for live watching to avoid rate limits
3. **Retries**: Built-in exponential backoff on 429 (rate limit) and 5xx errors
4. **Proxies**: Support for SOCKS5 (Python) and HTTP/HTTPS (both languages)

**Configure rate limiting:**

Python:
```python
client = TeleGlanceClient(rate_limit=2.0)  # 1 request per 2 seconds
```

TypeScript:
```typescript
const client = new TeleGlanceClient({ rateLimit: 2000 });  // milliseconds
```

---

## Data models

All returned data is strongly typed:

### Channel
- `name`: Channel username
- `title`: Display title
- `description`: Channel description (if available)
- `counts.subscribers`: Subscriber count
- `photo_url`: Profile photo URL

### Message
- `id`: Unique message ID
- `channel`: Channel username
- `date`: Posted timestamp (ISO 8601)
- `text`: Plain text content
- `html`: HTML content (if available)
- `views`: View count (approximate)
- `media`: Array of media attachments
- `reactions`: Array of emoji reactions
- `url`: Direct message URL

### Media
- `type`: `"photo"`, `"video"`, `"sticker"`, `"document"`, etc.
- `url`: Direct download URL
- `size_bytes`: File size (if available)
- `width`, `height`: Dimensions for photos/videos
- `duration_seconds`: Duration for videos/audio

---

## Advanced customization

### Custom CSS selectors

If Telegram changes their markup, override selectors:

```python
from teleglance.parsing.selectors import Selectors

custom_selectors = Selectors(
    channel_title=".tgme_channel_info_header_title",
    message_bubble=".tgme_widget_message",
    # ... other selectors
)

client = TeleGlanceClient(selectors=custom_selectors)
```

### Request/response hooks

Inspect or modify requests for logging or debugging:

```python
def log_request(url, params):
    print(f"GET {url} {params}")

client = TeleGlanceClient(request_hooks=[log_request])
```

### Custom checkpoint storage

Implement the `CheckpointStore` protocol for databases:

```python
from teleglance import CheckpointStore, CheckpointState

class DatabaseCheckpointStore(CheckpointStore):
    async def load(self, key: str) -> CheckpointState | None:
        # Load from database
        pass
    
    async def save(self, key: str, state: CheckpointState) -> None:
        # Save to database
        pass
```

---

## Documentation

Full documentation: **https://nwgkgit.github.io/TeleGlance/**

- [Python getting started](https://nwgkgit.github.io/TeleGlance/py/getting-started/)
- [Python API reference](https://nwgkgit.github.io/TeleGlance/py/api-reference/)
- [TypeScript getting started](https://nwgkgit.github.io/TeleGlance/ts/getting-started/)
- [TypeScript API reference](https://nwgkgit.github.io/TeleGlance/ts/api-reference/)

---

## Repository

Source code: **https://github.com/NWGKGIT/TeleGlance**

- Python package: `packages/python/`
- TypeScript package: `packages/ts/`

---

## License

MIT – see [LICENSE](https://github.com/NWGKGIT/TeleGlance/blob/main/LICENSE)

---

## Credits

TypeScript port by [@FuadTesfaye](https://github.com/FuadTesfaye).
