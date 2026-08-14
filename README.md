# TeleGlance

Async client for public Telegram channels via `t.me` web previews. No API keys, no MTProto, no account required.

This is a monorepo containing two independent, co-versioned packages:

| Package | Language | Install |
|---|---|---|
| [`packages/python`](./packages/python) | Python 3.10–3.14 | `pip install teleglance` |
| [`packages/ts`](./packages/ts) | TypeScript / Node ≥ 18 | `npm install teleglance` |

Both packages expose the same public surface — `TeleGlanceClient`, all models, errors, checkpoints, and an optional CLI — and produce identical JSON output so they can be used interchangeably or alongside each other.

---

## Quick start

### Python

```python
import asyncio
from teleglance import TeleGlanceClient

async def main():
    async with TeleGlanceClient() as client:
        channel = await client.get_channel("nahomssandbox")
        print(channel.title, channel.counts.subscribers)

        async for msg in client.iter_messages("nahomssandbox", limit=10):
            print(f"[{msg.id}] {msg.text[:80]}")

asyncio.run(main())
```

### TypeScript / Node

```typescript
import { TeleGlanceClient } from "teleglance";

const client = new TeleGlanceClient();
const channel = await client.getChannel("nahomssandbox");
console.log(channel.title, channel.counts.subscribers);

for await (const msg of client.iterMessages("nahomssandbox", { limit: 10 })) {
  console.log(`[${msg.id}] ${msg.text.slice(0, 80)}`);
}
await client.close();
```

---

## Repository layout

```
packages/
  python/       Python package (src-layout, hatchling, uv)
  ts/           TypeScript package (tsup, vitest, Node ≥ 18)
.github/
  workflows/
    ci.yml            Python + TypeScript quality, compat, and build checks
    drift-check.yml   Weekly live t.me selector drift probe (Python)
README.md       This file
CONTRIBUTING.md Contribution guide
LICENSE         MIT
```

Each package has its own `README.md`, changelog, and dependency lockfile. See those for package-specific installation and development instructions.

---

## Development

### Python

```bash
cd packages/python
uv sync --all-extras --group dev
uv run ruff check .
uv run pytest --cov
```

### TypeScript

```bash
cd packages/ts
npm install
npm run typecheck
npm test
npm run build
```

---

## Documentation

Full documentation is at **<https://NWGKGIT.github.io/TeleGlance/>**.

---

## License

MIT — see [LICENSE](./LICENSE).
