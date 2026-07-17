"""Message models."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from .media import Media

EntityType = Literal[
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "spoiler",
    "code",
    "pre",
    "link",
    "mention",
    "hashtag",
    "cashtag",
    "emoji",
    "custom_emoji",
]


class Entity(BaseModel):
    """A formatting span over ``Message.text``. Offsets are in Python string
    characters (codepoints), not UTF-16 units as in Bot API."""

    type: EntityType
    offset: int
    length: int
    url: str | None = None
    custom_emoji_id: str | None = None


class ForwardHeader(BaseModel):
    name: str
    url: str | None = None


class ReplyHeader(BaseModel):
    author: str | None = None
    text: str | None = None
    url: str | None = None
    msg_id: int | None = None


class Message(BaseModel):
    id: int
    channel: str
    url: str
    date: datetime | None = None
    views: int | None = None  # approximate — parsed from "1.2K" style display values
    views_str: str | None = None
    author: str | None = None  # post signature, when the channel uses them
    text: str = ""
    html: str | None = None  # original inner HTML of the text block
    markdown: str | None = None  # lossy Telegram-flavored markdown rendering
    entities: list[Entity] = []
    media: list[Media] = []
    forwarded_from: ForwardHeader | None = None
    reply_to: ReplyHeader | None = None
    raw_html: str = ""  # full outer HTML of the message node, for anything not parsed
