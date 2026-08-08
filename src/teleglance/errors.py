"""Typed exceptions raised by teleglance."""

from __future__ import annotations


class TeleGlanceError(Exception):
    """Base class for all teleglance errors."""


class InvalidChannel(TeleGlanceError, ValueError):
    """A channel reference could not be normalized to a public username."""

    def __init__(self, channel: str) -> None:
        self.channel = channel
        super().__init__(f"Invalid public channel reference: {channel!r}")


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


class RequestFailed(TeleGlanceError):
    """An HTTP request failed after retries or returned an unexpected status."""

    def __init__(
        self,
        url: str,
        *,
        status_code: int | None = None,
        cause: Exception | None = None,
    ) -> None:
        self.url = url
        self.status_code = status_code
        self.cause = cause
        if status_code is not None:
            detail = f"returned HTTP {status_code}"
        elif cause is not None:
            detail = f"failed: {cause}"
        else:
            detail = "failed"
        super().__init__(f"GET {url} {detail}")


class ParseError(TeleGlanceError):
    """The page structure was too broken to extract anything from."""


class DownloadError(TeleGlanceError):
    """A media object cannot be downloaded (no direct URL, or the fetch failed)."""


class CheckpointError(TeleGlanceError):
    """A checkpoint store could not be read or updated."""
