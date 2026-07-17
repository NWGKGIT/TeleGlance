"""Parsers for channel-level information and page-status detection."""

from __future__ import annotations

from selectolax.lexbor import LexborHTMLParser

from .._utils import clean_text, parse_count
from ..models import Channel, ChannelCounts
from .entities import inner_html


class PageKind:
    """What a fetched t.me page turned out to be."""

    FEED = "feed"  # /s/ preview with channel info (may have zero messages)
    CARD = "card"  # plain t.me/<name> profile card (no public preview from /s/)
    UNKNOWN = "unknown"  # neither — treat as not found


def classify_page(html: str) -> str:
    tree = LexborHTMLParser(html)
    if tree.css_first(".tgme_channel_info") is not None:
        return PageKind.FEED
    if tree.css_first(".tgme_page .tgme_page_title, .tgme_page_title") is not None:
        return PageKind.CARD
    return PageKind.UNKNOWN


def parse_channel(html: str, username: str) -> Channel | None:
    """Parse channel info from either a /s/ feed page (rich: counters) or a
    profile card page (title/description only). Returns None if the page has
    no channel data at all."""
    tree = LexborHTMLParser(html)

    info = tree.css_first(".tgme_channel_info")
    if info is not None:
        title_node = info.css_first(".tgme_channel_info_header_title")
        username_node = info.css_first(".tgme_channel_info_header_username a")
        description_node = info.css_first(".tgme_channel_info_description")
        avatar = info.css_first(".tgme_page_photo_image img, img.tgme_page_photo_image, img")

        raw_counts: dict[str, str] = {}
        for counter in info.css(".tgme_channel_info_counter"):
            value = counter.css_first(".counter_value")
            kind = counter.css_first(".counter_type")
            if value is not None and kind is not None:
                label = clean_text(kind.text()) or ""
                raw_counts[label] = clean_text(value.text()) or ""

        if username_node is not None:
            handle = (clean_text(username_node.text()) or "").lstrip("@") or username
        else:
            handle = username

        counts = ChannelCounts(
            subscribers=parse_count(raw_counts.get("subscribers") or raw_counts.get("subscriber")),
            photos=parse_count(raw_counts.get("photos") or raw_counts.get("photo")),
            videos=parse_count(raw_counts.get("videos") or raw_counts.get("video")),
            files=parse_count(raw_counts.get("files") or raw_counts.get("file")),
            links=parse_count(raw_counts.get("links") or raw_counts.get("link")),
            raw=raw_counts,
        )
        return Channel(
            username=handle,
            url=f"https://t.me/{handle}",
            title=clean_text(title_node.text(deep=True)) or handle if title_node is not None else handle,
            description=clean_text(description_node.text(deep=True))
            if description_node is not None
            else None,
            description_html=inner_html(description_node) if description_node is not None else None,
            avatar_url=avatar.attributes.get("src") if avatar is not None else None,
            counts=counts,
        )

    title_node = tree.css_first(".tgme_page_title")
    if title_node is not None:
        description_node = tree.css_first(".tgme_page_description")
        avatar = tree.css_first(".tgme_page_photo_image img, img.tgme_page_photo_image")
        extra = tree.css_first(".tgme_page_extra")
        raw_counts = {}
        subscribers = None
        extra_text = clean_text(extra.text()) if extra is not None else None
        if extra_text and "subscriber" in extra_text:
            raw_counts["subscribers"] = extra_text
            subscribers = parse_count(extra_text)
        return Channel(
            username=username,
            url=f"https://t.me/{username}",
            title=clean_text(title_node.text(deep=True)) or username,
            description=clean_text(description_node.text(deep=True))
            if description_node is not None
            else None,
            description_html=inner_html(description_node) if description_node is not None else None,
            avatar_url=avatar.attributes.get("src") if avatar is not None else None,
            counts=ChannelCounts(subscribers=subscribers, raw=raw_counts),
        )

    return None
