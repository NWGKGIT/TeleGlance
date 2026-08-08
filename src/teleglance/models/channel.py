"""Channel models."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ChannelCounts(BaseModel):
    """Approximate counts parsed from display values like "36.6K".

    ``raw`` preserves the exact strings shown on the page, keyed by counter
    label (``subscribers``, ``photos``, ``videos``, ``files``, ``links``).
    """

    subscribers: int | None = None
    photos: int | None = None
    videos: int | None = None
    files: int | None = None
    links: int | None = None
    raw: dict[str, str] = Field(default_factory=dict)


class Channel(BaseModel):
    username: str
    url: str
    title: str
    description: str | None = None
    description_html: str | None = None
    avatar_url: str | None = None
    counts: ChannelCounts = Field(default_factory=ChannelCounts)
