"""Parsers for channel-level information and page-status detection.

Like the message parsers, all structure comes from :class:`Selectors` —
nothing here hard-codes t.me class names.
"""

from __future__ import annotations

from selectolax.lexbor import LexborHTMLParser, LexborNode

from .._utils import clean_text, parse_count
from ..models import Channel, ChannelCounts
from .entities import inner_html
from .selectors import DEFAULT_SELECTORS, Selectors


class PageKind:
    """What a fetched t.me page turned out to be."""

    FEED = "feed"  # /s/ preview with channel info (may have zero messages)
    CARD = "card"  # plain t.me/<name> profile card (no public preview from /s/)
    NOT_FOUND = "not_found"
    UNKNOWN = "unknown"  # neither — likely markup drift or an interception page


def classify_page(html: str, selectors: Selectors | None = None) -> str:
    sel = selectors or DEFAULT_SELECTORS
    tree = LexborHTMLParser(html)
    if tree.css_first(sel.channel_info) is not None:
        return PageKind.FEED
    if tree.css_first(sel.card_title) is not None:
        return PageKind.CARD
    if tree.css_first(sel.not_found) is not None:
        return PageKind.NOT_FOUND
    return PageKind.UNKNOWN


def _text_of(container: LexborNode, selector: str) -> str | None:
    node = container.css_first(selector)
    return clean_text(node.text(deep=True)) if node is not None else None


def _html_of(container: LexborNode, selector: str) -> str | None:
    node = container.css_first(selector)
    return inner_html(node) if node is not None else None


def parse_channel(html: str, username: str, selectors: Selectors | None = None) -> Channel | None:
    """Parse channel info from either a /s/ feed page (rich: counters) or a
    profile card page (title/description only). Returns None if the page has
    no channel data at all."""
    sel = selectors or DEFAULT_SELECTORS
    tree = LexborHTMLParser(html)

    info = tree.css_first(sel.channel_info)
    if info is not None:
        username_node = info.css_first(sel.channel_username)
        if username_node is not None:
            handle = (clean_text(username_node.text()) or "").lstrip("@") or username
        else:
            handle = username

        raw_counts: dict[str, str] = {}
        for counter in info.css(sel.channel_counter):
            value = _text_of(counter, sel.counter_value)
            kind = _text_of(counter, sel.counter_type)
            if value and kind:
                raw_counts[kind] = value

        def count_of(*labels: str) -> int | None:
            for label in labels:
                if label in raw_counts:
                    return parse_count(raw_counts[label])
            return None

        avatar = info.css_first(sel.channel_avatar)
        return Channel(
            username=handle,
            url=f"https://t.me/{handle}",
            title=_text_of(info, sel.channel_title) or handle,
            description=_text_of(info, sel.channel_description),
            description_html=_html_of(info, sel.channel_description),
            avatar_url=avatar.attributes.get("src") if avatar is not None else None,
            counts=ChannelCounts(
                subscribers=count_of("subscribers", "subscriber"),
                photos=count_of("photos", "photo"),
                videos=count_of("videos", "video"),
                files=count_of("files", "file"),
                links=count_of("links", "link"),
                raw=raw_counts,
            ),
        )

    title = _text_of(tree.root, sel.card_title) if tree.root is not None else None
    if title is not None:
        avatar = tree.css_first(sel.card_avatar)
        raw_counts = {}
        subscribers = None
        extra_text = _text_of(tree.root, sel.card_extra)
        if extra_text and "subscriber" in extra_text:
            raw_counts["subscribers"] = extra_text
            subscribers = parse_count(extra_text)
        return Channel(
            username=username,
            url=f"https://t.me/{username}",
            title=title,
            description=_text_of(tree.root, sel.card_description),
            description_html=_html_of(tree.root, sel.card_description),
            avatar_url=avatar.attributes.get("src") if avatar is not None else None,
            counts=ChannelCounts(subscribers=subscribers, raw=raw_counts),
        )

    return None
