"""Typed exceptions raised by teleglance."""

from __future__ import annotations


class TeleGlanceError(Exception):
    """Base class for all teleglance errors."""


class ChannelNotFound(TeleGlanceError):
    """The username does not exist on Telegram."""

    def __init__(self, channel: str) -> None:
        self.channel = channel
        super().__init__(f"Channel not found: {channel!r}")


class ChannelPrivate(TeleGlanceError):
    """The channel exists but has no public web preview (private, or previews disabled)."""

    def __init__(self, channel: str) -> None:
        self.channel = channel
        super().__init__(f"Channel has no public preview: {channel!r}")


class MessageNotFound(TeleGlanceError):
    """The requested message id does not exist (or was deleted) in the channel."""

    def __init__(self, channel: str, msg_id: int) -> None:
        self.channel = channel
        self.msg_id = msg_id
        super().__init__(f"Message {msg_id} not found in {channel!r}")


class RateLimited(TeleGlanceError):
    """t.me kept answering 429 after all retries."""

    def __init__(self, retry_after: float | None = None) -> None:
        self.retry_after = retry_after
        hint = f", retry after {retry_after:.0f}s" if retry_after else ""
        super().__init__(f"Rate limited by t.me{hint}")


class ParseError(TeleGlanceError):
    """The page structure was too broken to extract anything from."""


class DownloadError(TeleGlanceError):
    """A media object cannot be downloaded (no direct URL, or the fetch failed)."""
