# Advanced Customization

TeleGlance is designed to handle markup changes and allow low-level networking adjustments without code changes.

---

## Transport Hooks

Observability hooks use HTTPX native event hooks. Pass functions into `request_hooks` or `response_hooks` to intercept network events:

```python
import httpx
from teleglance import TeleGlanceClient


async def on_request(request: httpx.Request):
    print(f"Request: {request.method} {request.url}")


async def on_response(response: httpx.Response):
    print(f"Response: {response.status_code}")


async def main():
    async with TeleGlanceClient(request_hooks=[on_request], response_hooks=[on_response]) as client:
        await client.get_channel("nahomssandbox")
```

---

## Selectors Override

All HTML classes and attributes are stored in a centralized `Selectors` configuration class. If Telegram alters class names, pass overrides directly:

```python
from teleglance import DEFAULT_SELECTORS, TeleGlanceClient

# Change views count selector without changing library files
custom_selectors = DEFAULT_SELECTORS.replace(views=".tgme_widget_message_views_updated")

client = TeleGlanceClient(selectors=custom_selectors)
```

You can also load custom selectors from a JSON file:

```python
import json
from teleglance import Selectors, TeleGlanceClient

with open("selectors.json") as f:
    selectors = Selectors.from_dict(json.load(f))

client = TeleGlanceClient(selectors=selectors)
```

---

## Custom Parser Registry

If Telegram rolls out a new widget block, you can write and register custom parsing logic.

A parsing function receives the parsed message node (a `selectolax` parser node) and returns a list of media structures or fallbacks:

```python
from teleglance import TeleGlanceClient, Unsupported, default_registry

# 1. Initialize registry with default parsers
registry = default_registry()


# 2. Define custom parsing function
def parse_gift_widget(message_node):
    block = message_node.css_first(".tgme_widget_message_gift")
    if block:
        # Return Unsupported model carrying the raw HTML
        return [Unsupported(raw_html=block.html)]
    return []


# 3. Register custom function
registry.register("gift", parse_gift_widget)

# 4. Instantiate client
client = TeleGlanceClient(registry=registry)
```

---

## Proxies

Specify proxies using standard format strings:

```python
# HTTP/HTTPS Proxy
client = TeleGlanceClient(proxy="http://127.0.0.1:8080")

# SOCKS5 Proxy (Requires [socks] installation extra)
client = TeleGlanceClient(proxy="socks5://127.0.0.1:9050")
```
