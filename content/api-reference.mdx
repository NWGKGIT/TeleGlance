# API Reference

Detailed specifications of the classes, client methods, data models, and custom exceptions in TeleGlance.

---

## TeleGlanceClient

The main client interface for communicating with Telegram web previews.

### Constructor

```python
class TeleGlanceClient:
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
        selectors: Selectors | None = None,
        transport: TransportProtocol | None = None,
        strict_parsing: bool = False,
    )
```

* **Parameters**:
  * `base_url`: Target URL for Telegram previews. Defaults to `https://t.me`.
  * `rate_limit`: Maximum requests per second. Defaults to `1.0`. Set to `0` to disable request throttling.
  * `retries`: Number of retry attempts on HTTP failure or 429 status codes. Defaults to `3`.
  * `timeout`: Request timeout in seconds. Defaults to `15.0`.
  * `proxy`: Proxy server URL (HTTP, HTTPS, SOCKS4, SOCKS5).
  * `headers`: Custom headers to merge into request headers.
  * `request_hooks`: Callbacks executed before sending requests.
  * `response_hooks`: Callbacks executed after receiving responses.
  * `registry`: ParserRegistry containing custom parsing functions.
  * `selectors`: Custom Selectors mapping for extraction.
  * `strict_parsing`: When enabled, recognized pages containing layout containers but no posts raise a ParseError instead of returning empty lists.

---

### Async Methods

#### `get_channel`
Retrieve metadata details for a public Telegram channel.
```python
async def get_channel(self, channel: str) -> Channel
```
* **Parameters**:
  * `channel`: Target channel identifier (e.g. name, @name, link).
* **Raises**:
  * `ChannelNotFound`: If the channel does not exist on Telegram.
  * `ChannelPrivate`: If the channel is private.

#### `get_message`
Fetch a single message by ID.
```python
async def get_message(self, channel: str, msg_id: int) -> Message
```
* **Parameters**:
  * `channel`: Target channel identifier.
  * `msg_id`: Message ID to search for. Must be a positive integer.
* **Raises**:
  * `MessageNotFound`: If the message does not exist or has been deleted.

#### `iter_messages`
Iterate channel posts backwards (newest to oldest).
```python
async def iter_messages(
    self,
    channel: str,
    *,
    limit: int | None = None,
    before: int | None = None,
    query: str | None = None,
) -> AsyncIterator[Message]
```
* **Parameters**:
  * `channel`: Target channel identifier.
  * `limit`: Maximum number of messages to yield.
  * `before`: Message ID cursor. Yields posts strictly older than this ID.
  * `query`: Filter messages by keyword search.

#### `iter_new_messages`
Iterate channel posts forwards (oldest to newest).
```python
async def iter_new_messages(
    self,
    channel: str,
    *,
    after: int,
    limit: int | None = None,
) -> AsyncIterator[Message]
```
* **Parameters**:
  * `channel`: Target channel identifier.
  * `after`: Message ID cursor. Yields posts strictly newer than this ID.
  * `limit`: Maximum number of messages to yield.

#### `search`
Search channel messages. An alias for `iter_messages` with a query filter.
```python
def search(
    self,
    channel: str,
    query: str,
    *,
    limit: int | None = None,
) -> AsyncIterator[Message]
```

#### `watch`
Start a live poller that yields new posts.
```python
def watch(
    self,
    channel: str,
    *,
    interval: float = 30.0,
    since_id: int | None = None,
) -> AsyncIterator[Message]
```
* **Parameters**:
  * `channel`: Target channel identifier.
  * `interval`: Polling interval in seconds. Defaults to `30.0`.
  * `since_id`: Filter posts newer than this ID. Defaults to the newest post ID found on startup.

#### `download_media`
Download media attachments to disk.
```python
async def download_media(
    self,
    media: Media | str,
    dest: str | Path | None = None,
    *,
    filename: str | None = None,
    overwrite: bool = False,
    max_bytes: int | None = None,
) -> Path
```
* **Parameters**:
  * `media`: Target Media object or direct download URL string.
  * `dest`: Directory path or full file destination path.
  * `filename`: Optional filename override.
  * `overwrite`: Set to True to replace existing files.
  * `max_bytes`: Exceeding this size raises a DownloadError.

#### `download_bytes`
Download media attachments directly into memory.
```python
async def download_bytes(
    self,
    media: Media | str,
    *,
    max_bytes: int | None = None,
) -> bytes
```

---

## Data Models

Pydantic V2 models returned by TeleGlance.

### Channel
Represents public Telegram channel details.
* `username` (`str`): Target handle of the channel.
* `url` (`str`): Direct t.me/s/ URL.
* `title` (`str`): Title of the channel.
* `description` (`str | None`): Text description.
* `description_html` (`str | None`): HTML description.
* `avatar_url` (`str | None`): Image URL.
* `counts` (`ChannelCounts`): Approximate subscriber and media attachment counters.

### Message
Represents a single Telegram post.
* `id` (`int`): Unique message ID.
* `channel` (`str`): Channel handle.
* `url` (`str`): Direct message URL.
* `date` (`datetime | None`): Publish timestamp.
* `views` (`int | None`): Estimated view count.
* `views_str` (`str | None`): Raw views text (e.g. "1.2K").
* `author` (`str | None`): Signature of post author.
* `text` (`str`): Text content.
* `html` (`str | None`): Inner HTML of post content.
* `markdown` (`str | None`): Lossy markdown formatting.
* `entities` (`list[Entity]`): Text styles, hyperlinks, and mentions.
* `media` (`list[Media]`): Media attachments.
* `reactions` (`list[Reaction]`): Active emoji reactions.
* `raw_html` (`str`): Complete HTML node string.

---

## Custom Exceptions

* `TeleGlanceError`: Base package exception.
* `InvalidChannel`: Raised when channel identifier formats are invalid.
* `ChannelNotFound`: Raised when a public channel is not found.
* `ChannelPrivate`: Raised when a channel is private or previews are blocked.
* `MessageNotFound`: Raised when a specific message ID does not exist.
* `ParseError`: Raised when the parser fails to understand layout structures.
* `RateLimited`: Raised when requests exceed Telegram rate limits.
* `DownloadError`: Raised when media downloads fail or exceed limits.
* `CheckpointError`: Raised when reading or writing checkpoints fails.
