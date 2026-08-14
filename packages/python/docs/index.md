# TeleGlance Documentation

TeleGlance is an asynchronous Python client for public Telegram channels. It leverages Telegram's public web preview pages (t.me previews) to extract channel information, messages, search results, and media files.

Unlike traditional Telegram API clients, TeleGlance requires:
* No Telegram API credentials (no API ID or API Hash)
* No MTProto protocol implementation
* No user account registration or active session management

This makes TeleGlance suitable for simple automation scripts, microservices, and lightweight public-data monitors where user authentication or complex session management is undesirable.

---

## Core Value Proposition

* **Low Overhead**: Zero credentials to manage or store. Ideal for fast deployments.
* **Asynchronous Design**: Built entirely around Python asyncio, enabling non-blocking integration with web applications or concurrent pollers.
* **Robust Customization**: Separates HTML parsing, request configurations, CSS selector templates, and media downloads to keep the client operational during markup changes.

---

## High-Level Architecture

TeleGlance splits network requests and data processing into two separate components:

```
            +--------------------------------------------+
            |              TeleGlanceClient              |
            +--------------------------------------------+
            | Handles Pydantic validation, pagination,   |
            | live watcher loops, and media download     |
            | orchestration.                             |
            +--------------------------------------------+
                                  |
                                  v
            +--------------------------------------------+
            |                 Transport                  |
            +--------------------------------------------+
            | Handles connection pooling via HTTPX,      |
            | request rate-limiting (pacing), retries,   |
            | proxy configuration, and custom event      |
            | request/response hooks.                    |
            +--------------------------------------------+
```

### TeleGlanceClient
The main entry point for developers. It coordinates inputs, normalizes raw channel links, queries HTML pages, and maps element nodes to strongly-typed Pydantic V2 models.

### Transport
The HTTP communicator. It handles connection mechanics, throttles requests to respect rate limits, implements exponential backoff on HTTP 429 status codes, and executes user-defined request/response event hooks.
