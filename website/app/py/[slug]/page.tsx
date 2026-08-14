import { notFound } from 'next/navigation';
import { CodeBlock } from '../../../components/code-block';
import { PageHeader } from '../../../components/page-header';
import { Section } from '../../../components/section';

const pages = {
  'getting-started': { title: 'Getting started', description: 'Install the Python package and make your first request.' },
  'api-reference': { title: 'API reference', description: 'Complete client API, methods, and return types.' },
  'checkpoints': { title: 'Checkpoints', description: 'Resume history and live streams without reprocessing messages.' },
  'media-downloads': { title: 'Media downloads', description: 'Download photos, videos, stickers, and documents.' },
  'live-watching': { title: 'Live watching', description: 'Poll for new messages in real-time with automatic retries.' },
  'customization': { title: 'Customization', description: 'Configure transport, selectors, parsers, and error handling.' },
} as const;

export function generateStaticParams() { return Object.keys(pages).map((slug) => ({ slug })); }

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const page = pages[params.slug as keyof typeof pages];
  if (!page) return {};
  return { title: page.title };
}

export default function PythonPage({ params }: { params: { slug: string } }) {
  const page = pages[params.slug as keyof typeof pages];
  if (!page) notFound();

  return <div className="content-body">
    <PageHeader eyebrow="Python" title={page.title} description={page.description} />

    {params.slug === 'getting-started' && <>
      <Section title="Install">
        <p>TeleGlance supports Python 3.10 through 3.14. Install from PyPI:</p>
        <CodeBlock language="Bash">{`pip install teleglance

# Optional extras for CLI and SOCKS proxy support
pip install "teleglance[cli,socks]"`}</CodeBlock>
      </Section>

      <Section title="First request">
        <p>The client is async and designed to be used with <code>async with</code> for automatic cleanup:</p>
        <CodeBlock language="Python">{`import asyncio
from teleglance import TeleGlanceClient

async def main():
    async with TeleGlanceClient() as client:
        # Get channel metadata
        channel = await client.get_channel("telegram")
        print(channel.title, channel.counts.subscribers)

        # Iterate over recent messages
        async for message in client.iter_messages("telegram", limit=10):
            print(f"{message.id}: {message.text[:80]}")

asyncio.run(main())`}</CodeBlock>
      </Section>

      <Section title="Pagination">
        <p>History is newest-first by default. Use <code>before</code> for older messages:</p>
        <CodeBlock language="Python">{`# Get first page
messages = await client.get_messages("telegram", limit=20)

# Get next page using oldest message ID
older = await client.get_messages("telegram", limit=20, before=messages[-1].id)

# Or iterate automatically
async for message in client.iter_messages("telegram", limit=100):
    print(message.id, message.date)`}</CodeBlock>
      </Section>

      <Section title="Search">
        <p>Search within a channel using keyword queries:</p>
        <CodeBlock language="Python">{`async for message in client.search("telegram", "release", limit=20):
    print(message.url)

# Search also supports before/after pagination
results = await client.search("python", "async", limit=50)`}</CodeBlock>
      </Section>

      <Section title="CLI usage">
        <p>The CLI provides JSON output for scripting and data export:</p>
        <CodeBlock language="Bash">{`# Get channel info
teleglance channel telegram --output channel.json

# Fetch message history
teleglance messages telegram --limit 100 --output messages.json

# Search and save results
teleglance search telegram "release" --limit 50 --output search.json`}</CodeBlock>
      </Section>
    </>}

    {params.slug === 'api-reference' && <>
      <Section title="TeleGlanceClient">
        <p>The main client class for all operations.</p>
        <CodeBlock language="Python">{`client = TeleGlanceClient(
    base_url="https://t.me",          # Base URL for requests
    rate_limit=1.0,                    # Seconds between requests
    retries=3,                         # Retry attempts on failure
    timeout=15.0,                      # Request timeout in seconds
    proxy=None,                        # SOCKS5 proxy URL
    headers=None,                      # Custom HTTP headers
    registry=None,                     # Custom parser registry
    selectors=None,                    # Custom CSS selectors
    strict_parsing=False,              # Raise on parse warnings
)`}</CodeBlock>
      </Section>

      <Section title="get_channel">
        <p>Fetch channel metadata including title, description, and subscriber count.</p>
        <CodeBlock language="Python">{`channel = await client.get_channel("telegram")

print(channel.name)              # Channel username
print(channel.title)             # Display title
print(channel.description)       # Channel description (if available)
print(channel.counts.subscribers) # Subscriber count
print(channel.photo_url)         # Profile photo URL (if available)`}</CodeBlock>
      </Section>

      <Section title="get_message">
        <p>Fetch a single message by ID.</p>
        <CodeBlock language="Python">{`message = await client.get_message("telegram", 12345)

print(message.id)                # Message ID
print(message.text)              # Text content
print(message.date)              # Posted timestamp
print(message.views)             # View count
print(message.media)             # Media attachments (if any)`}</CodeBlock>
      </Section>

      <Section title="get_messages">
        <p>Fetch a page of messages. Returns newest-first by default.</p>
        <CodeBlock language="Python">{`# Get latest messages
messages = await client.get_messages("telegram", limit=20)

# Paginate backwards
older = await client.get_messages("telegram", limit=20, before=messages[-1].id)

# Get newer messages (forward pagination)
newer = await client.get_messages("telegram", limit=20, after=oldest_id)`}</CodeBlock>
      </Section>

      <Section title="iter_messages">
        <p>Async iterator for history pagination. Automatically fetches pages.</p>
        <CodeBlock language="Python">{`async for message in client.iter_messages("telegram", limit=100):
    print(message.id, message.text)

# With before cursor
async for message in client.iter_messages("telegram", limit=50, before=message_id):
    process(message)`}</CodeBlock>
      </Section>

      <Section title="iter_new_messages">
        <p>Iterate forward in time from a given message ID (oldest-first).</p>
        <CodeBlock language="Python">{`# Get all messages after ID 12345
async for message in client.iter_new_messages("telegram", after=12345):
    print(f"New: {message.id}")`}</CodeBlock>
      </Section>

      <Section title="search">
        <p>Search for messages matching a query string.</p>
        <CodeBlock language="Python">{`# Simple search
results = await client.search("telegram", "python", limit=20)

# Async iteration
async for message in client.search("telegram", "release notes", limit=100):
    print(message.url)`}</CodeBlock>
      </Section>

      <Section title="watch">
        <p>Poll for new messages in real-time. See Live watching page for details.</p>
        <CodeBlock language="Python">{`async for message in client.watch("telegram", interval=30.0):
    print(f"New post: {message.id}")`}</CodeBlock>
      </Section>

      <Section title="Models">
        <p>All models are Pydantic objects with type validation and serialization.</p>
        <CodeBlock language="Python">{`from teleglance import Channel, Message, Media

# Serialize to dict
data = message.model_dump()

# Serialize to JSON
json_str = message.model_dump_json()

# Access nested fields
if message.media:
    for item in message.media:
        print(item.type, item.url)`}</CodeBlock>
      </Section>
    </>}

    {params.slug === 'checkpoints' && <>
      <Section title="What are checkpoints?">
        <p>Checkpoints track your position in a message stream so you can resume without reprocessing. They store the oldest and newest message IDs you've seen, along with the channel name to prevent accidental reuse across channels.</p>
      </Section>

      <Section title="JsonCheckpointStore">
        <p>Built-in file-based checkpoint storage using versioned JSON.</p>
        <CodeBlock language="Python">{`from teleglance import JsonCheckpointStore

store = JsonCheckpointStore("state.json")

# Load checkpoint (returns None if not found)
state = await store.load("stream:telegram")

# Start from checkpoint or beginning
after_id = state.newest_id if state else None

async for message in client.iter_new_messages("telegram", after=after_id):
    # Process message
    print(message.id)

    # Update checkpoint
    if state is None:
        from teleglance import CheckpointState
        state = CheckpointState(channel="telegram", oldest_id=message.id, newest_id=message.id)
    else:
        state = state.record(message)

    # Save periodically
    await store.save("stream:telegram", state)`}</CodeBlock>
      </Section>

      <Section title="Resume history iteration">
        <p>Use checkpoints to resume backward pagination through history.</p>
        <CodeBlock language="Python">{`store = JsonCheckpointStore("history.json")
state = await store.load("history:telegram")

# Resume from where we left off
before_id = state.oldest_id if state else None

async for message in client.iter_messages("telegram", limit=1000, before=before_id):
    process(message)

    # Update checkpoint with oldest seen ID
    if state is None:
        state = CheckpointState(channel="telegram", oldest_id=message.id, newest_id=message.id)
    else:
        state = state.record(message)

    # Save every 50 messages
    if message.id % 50 == 0:
        await store.save("history:telegram", state)`}</CodeBlock>
      </Section>

      <Section title="Custom checkpoint backends">
        <p>Implement the <code>CheckpointStore</code> protocol for databases or other storage:</p>
        <CodeBlock language="Python">{`from teleglance import CheckpointStore, CheckpointState

class RedisCheckpointStore(CheckpointStore):
    def __init__(self, redis_client):
        self.redis = redis_client

    async def load(self, key: str) -> CheckpointState | None:
        data = await self.redis.get(f"checkpoint:{key}")
        if data:
            return CheckpointState.model_validate_json(data)
        return None

    async def save(self, key: str, state: CheckpointState) -> None:
        await self.redis.set(f"checkpoint:{key}", state.model_dump_json())

store = RedisCheckpointStore(redis_client)
state = await store.load("stream:telegram")`}</CodeBlock>
      </Section>
    </>}

    {params.slug === 'media-downloads' && <>
      <Section title="download_media">
        <p>Download media to disk with automatic filename handling.</p>
        <CodeBlock language="Python">{`async for message in client.iter_messages("telegram", limit=20):
    if message.media:
        for item in message.media:
            # Download to directory (auto-generates filename)
            path = await client.download_media(item, "./downloads")
            print(f"Saved to {path}")

            # With overwrite control
            path = await client.download_media(
                item,
                "./downloads",
                overwrite=False  # Skip if file exists
            )`}</CodeBlock>
      </Section>

      <Section title="download_bytes">
        <p>Download media to memory for processing without saving to disk.</p>
        <CodeBlock language="Python">{`async for message in client.iter_messages("photos", limit=10):
    if message.media:
        for photo in message.media:
            # Download to bytes
            data = await client.download_bytes(photo)

            # With size limit
            data = await client.download_bytes(
                photo,
                max_bytes=10_000_000  # 10 MB limit
            )

            # Process in memory
            from PIL import Image
            import io
            image = Image.open(io.BytesIO(data))
            image.thumbnail((200, 200))
            image.save("thumbnail.jpg")`}</CodeBlock>
      </Section>

      <Section title="Media types">
        <p>Messages can contain photos, videos, stickers, documents, and more.</p>
        <CodeBlock language="Python">{`if message.media:
    for item in message.media:
        print(f"Type: {item.type}")        # photo, video, sticker, document, etc.
        print(f"URL: {item.url}")          # Direct download URL
        print(f"Size: {item.size_bytes}")  # File size (if available)

        # Type-specific fields
        if item.type == "photo":
            print(f"Dimensions: {item.width}x{item.height}")
        elif item.type == "video":
            print(f"Duration: {item.duration_seconds}s")`}</CodeBlock>
      </Section>

      <Section title="Error handling">
        <p>Handle download failures gracefully.</p>
        <CodeBlock language="Python">{`from teleglance import RequestFailed

async for message in client.iter_messages("channel", limit=50):
    if message.media:
        for item in message.media:
            try:
                path = await client.download_media(item, "./downloads")
                print(f"Downloaded: {path}")
            except RequestFailed as e:
                print(f"Failed to download {item.url}: {e}")
            except OSError as e:
                print(f"Disk error: {e}")`}</CodeBlock>
      </Section>
    </>}

    {params.slug === 'live-watching' && <>
      <Section title="watch">
        <p>Poll a channel for new messages in real-time. The watcher handles transient failures automatically and only propagates fatal errors.</p>
        <CodeBlock language="Python">{`async for message in client.watch("telegram", interval=30.0):
    print(f"New message: {message.id}")
    print(message.text)

# The loop runs forever until interrupted or the channel becomes inaccessible`}</CodeBlock>
      </Section>

      <Section title="Resume from checkpoint">
        <p>Combine watch with checkpoints to avoid missing messages across restarts.</p>
        <CodeBlock language="Python">{`from teleglance import JsonCheckpointStore

store = JsonCheckpointStore("watch.json")
state = await store.load("watch:telegram")

# Start watching from last seen message
since_id = state.newest_id if state else None

async for message in client.watch("telegram", interval=30.0, since_id=since_id):
    print(f"New: {message.id}")

    # Update checkpoint
    if state is None:
        from teleglance import CheckpointState
        state = CheckpointState(channel="telegram", oldest_id=message.id, newest_id=message.id)
    else:
        state = state.record(message)

    await store.save("watch:telegram", state)`}</CodeBlock>
      </Section>

      <Section title="Error handling">
        <p>Transient errors (rate limits, network issues, parse failures) are logged and retried automatically. Fatal errors (channel deleted, made private) propagate immediately.</p>
        <CodeBlock language="Python">{`import logging
from teleglance import ChannelNotFound, ChannelPrivate

logging.basicConfig(level=logging.WARNING)

try:
    async for message in client.watch("telegram", interval=30.0):
        process(message)
except ChannelNotFound:
    print("Channel was deleted")
except ChannelPrivate:
    print("Channel was made private")
except KeyboardInterrupt:
    print("Stopped by user")`}</CodeBlock>
      </Section>

      <Section title="Interval tuning">
        <p>Choose an interval based on channel activity and rate-limit tolerance.</p>
        <CodeBlock language="Python">{`# High-frequency channel (post every few minutes)
async for msg in client.watch("breaking_news", interval=10.0):
    alert(msg)

# Low-frequency channel (few posts per day)
async for msg in client.watch("announcements", interval=300.0):
    archive(msg)

# Minimum safe interval is ~5 seconds to avoid rate limiting`}</CodeBlock>
      </Section>

      <Section title="CLI watch">
        <p>The CLI can watch channels and append to NDJSON files.</p>
        <CodeBlock language="Bash">{`# Watch and print to stdout
teleglance watch telegram --interval 30

# Append to NDJSON file
teleglance watch telegram --interval 30 --output watch.ndjson

# Resume from existing NDJSON (reads last line)
teleglance watch telegram --interval 30 --output watch.ndjson --resume`}</CodeBlock>
      </Section>
    </>}

    {params.slug === 'customization' && <>
      <Section title="Proxy configuration">
        <p>Route requests through SOCKS5 proxies for privacy or to bypass restrictions.</p>
        <CodeBlock language="Python">{`client = TeleGlanceClient(proxy="socks5://127.0.0.1:9050")

# With authentication
client = TeleGlanceClient(proxy="socks5://user:pass@proxy.example.com:1080")`}</CodeBlock>
        <p>Requires the <code>socks</code> extra: <code>pip install "teleglance[socks]"</code></p>
      </Section>

      <Section title="Rate limiting">
        <p>Control request rate to avoid triggering Telegram's rate limits.</p>
        <CodeBlock language="Python">{`# Default: 1 request per second
client = TeleGlanceClient(rate_limit=1.0)

# More conservative
client = TeleGlanceClient(rate_limit=2.0)

# Aggressive (risk rate limiting)
client = TeleGlanceClient(rate_limit=0.5)`}</CodeBlock>
      </Section>

      <Section title="Custom headers">
        <p>Override User-Agent or add custom headers.</p>
        <CodeBlock language="Python">{`client = TeleGlanceClient(headers={
    "User-Agent": "MyBot/1.0",
    "Accept-Language": "en-US,en;q=0.9",
})`}</CodeBlock>
      </Section>

      <Section title="Strict parsing">
        <p>Enable strict mode to raise exceptions on parsing warnings.</p>
        <CodeBlock language="Python">{`# Default: log warnings but continue
client = TeleGlanceClient(strict_parsing=False)

# Strict: raise ParseError on any parsing issue
client = TeleGlanceClient(strict_parsing=True)`}</CodeBlock>
      </Section>

      <Section title="Custom selectors">
        <p>Override CSS selectors if Telegram changes their markup.</p>
        <CodeBlock language="Python">{`from teleglance.parsing.selectors import Selectors

custom_selectors = Selectors(
    channel_title=".tgme_channel_info_header_title",
    message_bubble=".tgme_widget_message",
    # ... other selectors
)

client = TeleGlanceClient(selectors=custom_selectors)`}</CodeBlock>
      </Section>

      <Section title="Request hooks">
        <p>Inspect or modify requests before they're sent.</p>
        <CodeBlock language="Python">{`def log_request(url, params):
    print(f"GET {url} {params}")

client = TeleGlanceClient(request_hooks=[log_request])`}</CodeBlock>
      </Section>

      <Section title="Response hooks">
        <p>Inspect responses after they arrive.</p>
        <CodeBlock language="Python">{`def log_response(response):
    print(f"Response: {response.status_code} {len(response.content)} bytes")

client = TeleGlanceClient(response_hooks=[log_response])`}</CodeBlock>
      </Section>
    </>}
  </div>;
}
