"""teleglance — async client for public Telegram channels via t.me web previews."""

from importlib.metadata import PackageNotFoundError, version

from .checkpoints import CheckpointStore, JsonCheckpointStore, MessageCheckpoint
from .client import TeleGlanceClient
from .errors import (
    ChannelNotFound,
    ChannelPrivate,
    CheckpointError,
    DownloadError,
    InvalidChannel,
    MessageNotFound,
    ParseError,
    RateLimited,
    RequestFailed,
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
    Reaction,
    ReplyHeader,
    RoundVideo,
    Sticker,
    Unsupported,
    Video,
    Voice,
)
from .parsing import DEFAULT_SELECTORS, ParserRegistry, Selectors, default_registry
from .transport import Transport, TransportProtocol

try:
    __version__ = version("teleglance")
except PackageNotFoundError:  # pragma: no cover - source tree without installation
    __version__ = "0.1.0"

Client = TeleGlanceClient  # convenience alias

__all__ = [
    "Channel",
    "ChannelCounts",
    "ChannelNotFound",
    "ChannelPrivate",
    "CheckpointError",
    "CheckpointStore",
    "Client",
    "DEFAULT_SELECTORS",
    "DocumentRef",
    "DownloadError",
    "Entity",
    "ForwardHeader",
    "InvalidChannel",
    "JsonCheckpointStore",
    "LinkPreview",
    "Location",
    "Media",
    "Message",
    "MessageNotFound",
    "MessageCheckpoint",
    "ParseError",
    "ParserRegistry",
    "Photo",
    "Poll",
    "PollOption",
    "RateLimited",
    "Reaction",
    "ReplyHeader",
    "RequestFailed",
    "RoundVideo",
    "Selectors",
    "Sticker",
    "TeleGlanceClient",
    "TeleGlanceError",
    "Transport",
    "TransportProtocol",
    "Unsupported",
    "Video",
    "Voice",
    "default_registry",
]
