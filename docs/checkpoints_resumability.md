# Checkpoints and Resumability

TeleGlance includes checkpointing utilities to track scraping progress. If your scraping process halts due to crashes, network interruptions, or rate limits, you can resume precisely where you left off.

---

## Watermarks

Checkpointing works by keeping track of two bounds (watermarks) for a given channel:

1. **`oldest_id`**: The lowest message ID you have processed. Used for paginating backward into the past.
2. **`newest_id`**: The highest message ID you have processed. Used for forward collection and monitoring updates.

---

## JsonCheckpointStore

`JsonCheckpointStore` is a single-writer checkpoint tracker included in the package. It writes updates atomically to a local JSON file.

### Backwards Collection (History)

To scrape history backwards without reprocessing messages, pass the `oldest_id` to `before`:

```python
import asyncio
from teleglance import JsonCheckpointStore, MessageCheckpoint, TeleGlanceClient


async def main():
    # Initialize store pointing to a local file
    store = JsonCheckpointStore("scraper_state.json")

    # Load existing state, or fall back to a empty checkpoint
    state = await store.load("history:nahomssandbox") or MessageCheckpoint(channel="nahomssandbox")

    async with TeleGlanceClient() as client:
        # Pass state.oldest_id to prevent duplicate scraping
        async for message in client.iter_messages(
            "nahomssandbox", before=state.oldest_id, limit=50
        ):
            # Process the message
            print(f"Scraped history message: {message.id}")

            # Record changes to watermarks
            state = state.record(message)

            # Save checkpoint state atomically
            await store.save("history:nahomssandbox", state)


if __name__ == "__main__":
    asyncio.run(main())
```

### Forwards Collection (New Posts)

To fetch posts created since your last check, use `iter_new_messages` with `after`:

```python
async def check_updates():
    store = JsonCheckpointStore("scraper_state.json")
    state = await store.load("history:nahomssandbox")
    
    if not state or state.newest_id is None:
        print("No previous checkpoint state found.")
        return
        
    async with TeleGlanceClient() as client:
        async for message in client.iter_new_messages("nahomssandbox", after=state.newest_id):
            print(f"Scraped new update: {message.id}")
            state = state.record(message)
            await store.save("history:nahomssandbox", state)
```

---

## Custom Checkpoint Stores

The checkpoint store implements a basic `CheckpointStore` protocol. You can substitute the default JSON store with custom storage solutions (such as Redis, SQLite, or PostgreSQL) by implementing `load` and `save` methods:

```python
from typing import Protocol
from teleglance import MessageCheckpoint


class CheckpointStore(Protocol):
    async def load(self, key: str) -> MessageCheckpoint | None: ...

    async def save(self, key: str, checkpoint: MessageCheckpoint) -> None: ...
```
