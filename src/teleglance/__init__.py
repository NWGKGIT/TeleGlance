"""teleglance — async client for public Telegram channels via t.me web previews."""

from .client import TeleGlanceClient
from .errors import (
    ChannelNotFound,
    ChannelPrivate,
    DownloadError,
    MessageNotFound,
    ParseError,
    RateLimited,
    TeleGlanceError,
)
from .models import (
    Channel,
    ChannelCounts,
    DocumentRef,
    Entity,
    ForwardHeader,
    LinkPreview,
    Location,
    Media,
    Message,
    Photo,
    Poll,
    PollOption,
    ReplyHeader,
    RoundVideo,
    Sticker,
    Unsupported,
    Video,
    Voice,
)
from .parsing import ParserRegistry, default_registry
from .transport import Transport

__version__ = "0.1.0"

Client = TeleGlanceClient  # convenience alias

__all__ = [
    "Channel",
    "ChannelCounts",
    "ChannelNotFound",
    "ChannelPrivate",
    "Client",
    "DocumentRef",
    "DownloadError",
    "Entity",
    "ForwardHeader",
    "LinkPreview",
    "Location",
    "Media",
    "Message",
    "MessageNotFound",
    "ParseError",
    "ParserRegistry",
    "Photo",
    "Poll",
    "PollOption",
    "RateLimited",
    "ReplyHeader",
    "RoundVideo",
    "Sticker",
    "TeleGlanceClient",
    "TeleGlanceError",
    "Transport",
    "Unsupported",
    "Video",
    "Voice",
    "default_registry",
]
