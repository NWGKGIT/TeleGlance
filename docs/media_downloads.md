# Media Downloads

TeleGlance allows you to download files and assets attached to Telegram posts.

---

## Download Methods

You can download media using two client methods:

1. **`download_media`**: Save media directly to your filesystem.
2. **`download_bytes`**: Retrieve the media content directly in-memory as a `bytes` object.

---

## Code Example

```python
import asyncio
from teleglance import TeleGlanceClient

async def main():
    async with TeleGlanceClient() as client:
        async for message in client.iter_messages("nahomssandbox", limit=10):
            # Check if post contains attachments
            for media in message.media:
                if media.type == "photo":
                    # Download photo to local ./downloads folder
                    saved_path = await client.download_media(media, dest="./downloads")
                    print(f"Photo saved: {saved_path}")
                    
                elif media.type == "sticker":
                    # Retrieve sticker bytes directly
                    image_bytes = await client.download_bytes(media)
                    print(f"Sticker downloaded. Size: {len(image_bytes)} bytes")

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Filename Handling & File Length Limits

Telegram CDN URLs contain long hashes as file identifiers. These can produce filenames that exceed typical OS limits (usually 255 characters). 

* **Automatic Truncation**: TeleGlance truncates generated filenames to a maximum of **200 characters** to ensure that temporary file operations (which add prefixes or suffixes) do not cause filesystem errors.
* **Custom Naming**: If you want to use a specific name, pass a `filename` argument to the `download_media` function:
  ```python
  await client.download_media(photo, dest="./downloads", filename="logo.jpg")
  ```

---

## Important Media Limitations

When working with public Telegram web previews, keep the following limits in mind:

1. **No Document Downloads**: Telegram web previews do not include direct URLs for document attachments. You can retrieve document metadata (e.g. filename, title, extra sizes), but calling download methods on a document will raise a `DownloadError`.
2. **Missing Video Links**: Large video files may only expose a `thumb_url` instead of a full video download `url` in the web preview HTML structure.
3. **Throttled Speed**: Media downloads use the same HTTP Transport layer. This means they are subject to client rate-limiting and connection policies. Use SOCKS/HTTP proxies if you need to run high-volume download pipelines.
