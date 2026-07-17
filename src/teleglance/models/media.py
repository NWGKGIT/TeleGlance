"""Media attachments extracted from message previews.

Every model carries a ``type`` literal so the union is discriminated — a list of
media round-trips cleanly through ``model_dump_json`` / ``model_validate_json``.
"""

from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field


class Photo(BaseModel):
    type: Literal["photo"] = "photo"
    url: str


class Video(BaseModel):
    type: Literal["video"] = "video"
    url: str | None = None  # missing when t.me only shows a thumbnail (file too big)
    thumb_url: str | None = None
    duration: str | None = None  # "0:42" as displayed


class RoundVideo(BaseModel):
    type: Literal["round_video"] = "round_video"
    url: str | None = None
    thumb_url: str | None = None
    duration: str | None = None


class Voice(BaseModel):
    type: Literal["voice"] = "voice"
    url: str
    duration: str | None = None


class DocumentRef(BaseModel):
    """A file attachment. Previews never expose a direct download URL for
    documents — only the title and size are available."""

    type: Literal["document"] = "document"
    title: str
    extra: str | None = None  # e.g. "2.3 MB"


class Sticker(BaseModel):
    type: Literal["sticker"] = "sticker"
    url: str | None = None
    alt: str | None = None  # the emoji the sticker stands for


class PollOption(BaseModel):
    text: str
    percent: int | None = None


class Poll(BaseModel):
    type: Literal["poll"] = "poll"
    question: str
    kind: str | None = None  # "Anonymous Poll", "Quiz", ... as displayed
    options: list[PollOption] = []
    voters: str | None = None  # raw display value, e.g. "12.4K voted"


class LinkPreview(BaseModel):
    type: Literal["link_preview"] = "link_preview"
    url: str
    site_name: str | None = None
    title: str | None = None
    description: str | None = None
    image_url: str | None = None


class Location(BaseModel):
    type: Literal["location"] = "location"
    url: str | None = None  # maps link
    image_url: str | None = None  # static map preview


class Unsupported(BaseModel):
    """A block the parsers recognized but could not interpret. ``raw_html`` is
    kept so callers (or a registered custom parser) can handle it themselves."""

    type: Literal["unsupported"] = "unsupported"
    raw_html: str


Media = Annotated[
    Union[
        Photo,
        Video,
        RoundVideo,
        Voice,
        DocumentRef,
        Sticker,
        Poll,
        LinkPreview,
        Location,
        Unsupported,
    ],
    Field(discriminator="type"),
]
