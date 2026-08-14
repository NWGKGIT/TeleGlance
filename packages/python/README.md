# TeleGlance for Python

Async client for public Telegram channels via `t.me` web previews. No API keys, MTProto credentials, or Telegram account are required.

## Install

```sh
pip install teleglance
```

Python 3.10 or newer is required.

## Use

```python
import asyncio
from teleglance import TeleGlanceClient


async def main():
    async with TeleGlanceClient() as client:
        channel = await client.get_channel("telegram")
        print(channel.title)

        async for message in client.iter_messages("telegram", limit=10):
            print(message.id, message.text)


asyncio.run(main())
```

The package also provides typed models, checkpoints, media downloads, parser customization, and a `teleglance` command-line interface.

## Development

```sh
uv sync --all-extras --group dev
uv run ruff check .
uv run mypy
uv run pytest --cov
```

Licensed under MIT. See [LICENSE](../../LICENSE).
