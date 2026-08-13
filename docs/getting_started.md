# Getting Started

Learn how to install, configure, and verify your TeleGlance installation.

---

## Installation

TeleGlance requires Python 3.10 or newer.

### Using pip
To install the core library:
```bash
pip install teleglance
```

### Using uv
For modern Python projects using `uv`:
```bash
uv add teleglance
```

---

## Installation Extras

TeleGlance packages optional dependencies as extras to keep the core installation lightweight.

### CLI Utility (`[cli]`)
Installs command line capabilities along with packages like `click` and `rich`.
```bash
pip install "teleglance[cli]"
# or
uv add "teleglance[cli]"
```

### SOCKS Proxy Support (`[socks]`)
Installs SOCKS proxy libraries (like `socksio`) to enable SOCKS4 or SOCKS5 proxy routing.
```bash
pip install "teleglance[socks]"
# or
uv add "teleglance[socks]"
```

---

## Verify Your Installation

Create a new Python file named `test_teleglance.py` with the following content to verify that the client connects and reads data correctly from the example channel, `nahomssandbox`:

```python
import asyncio
from teleglance import TeleGlanceClient


async def main():
    async with TeleGlanceClient() as client:
        # Fetch target channel details
        channel = await client.get_channel("nahomssandbox")
        print(f"Connection Successful!")
        print(f"Channel Title: {channel.title}")
        print(f"Subscribers: {channel.counts.subscribers}")

        # Fetch and print the latest message text
        async for message in client.iter_messages("nahomssandbox", limit=1):
            print(f"Latest Post text: {message.text[:120]}")


if __name__ == "__main__":
    asyncio.run(main())
```

Run the script:
```bash
python test_teleglance.py
# or
uv run test_teleglance.py
```
If you see the channel title and subscribers printed to the terminal, your environment is correctly configured.
