"""Parsers for message nodes on t.me preview pages.

No class names live here — all structure comes from :mod:`.selectors`, so
markup drift is fixed by adjusting a :class:`Selectors` instance, not by
editing parser logic.
"""

from __future__ import annotations

from datetime import datetime
from functools import partial
from urllib.parse import parse_qs, urlparse

from selectolax.lexbor import LexborHTMLParser, LexborNode

from .._utils import bg_image_url, clean_text, parse_count
from ..errors import ParseError
from ..models import (
    DocumentRef,
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
    Video,
    Voice,
)
from .entities import extract_rich_text
from .registry import ParserRegistry
from .selectors import DEFAULT_SELECTORS, Selectors

# ---------------------------------------------------------------------------
# helpers


def _style_url(node: LexborNode | None) -> str | None:
    return bg_image_url(node.attributes.get("style")) if node is not None else None


def _classes(node: LexborNode) -> list[str]:
    return (node.attributes.get("class") or "").split()


def _has_ancestor_class(
    node: LexborNode, stop: LexborNode, classes: frozenset[str] | set[str]
) -> bool:
    parent = node.parent
    while parent is not None and parent is not stop:
        if any(c in classes for c in _classes(parent)):
            return True
        parent = parent.parent
    return False


def _msg_id_from_url(url: str | None) -> int | None:
    if not url:
        return None
    tail = url.rstrip("/").rsplit("/", 1)[-1].split("?", 1)[0]
    return int(tail) if tail.isdigit() else None


def _text_of(container: LexborNode, selector: str) -> str | None:
    node = container.css_first(selector)
    return clean_text(node.text(deep=True)) if node is not None else None


def _coordinates(url: str | None) -> tuple[float | None, float | None]:
    if not url:
        return None, None
    query = parse_qs(urlparse(url).query)
    value = next((query[key][0] for key in ("ll", "q") if query.get(key)), None)
    if not value or "," not in value:
        return None, None
    lat, lon = value.split(",", 1)
    try:
        return float(lat), float(lon)
    except ValueError:
        return None, None


# ---------------------------------------------------------------------------
# built-in block parsers — each takes the whole message node plus the active
# Selectors, and returns whatever media it recognizes


def parse_photos(node: LexborNode, sel: Selectors) -> list[Media]:
    out: list[Media] = []
    for wrap in node.css(sel.photo):
        url = _style_url(wrap)
        if url:
            out.append(Photo(url=url))
    return out


def parse_videos(node: LexborNode, sel: Selectors) -> list[Media]:
    out: list[Media] = []
    for player in node.css(sel.video_player):
        video = player.css_first(sel.video)
        video_classes = (video.attributes.get("class") or "") if video is not None else ""
        duration_node = player.css_first(sel.video_duration)
        duration = clean_text(duration_node.text()) if duration_node is not None else None
        url = video.attributes.get("src") if video is not None else None
        item: Media
        if sel.roundvideo_class in video_classes or player.css_first(sel.roundvideo) is not None:
            item = RoundVideo(
                url=url,
                thumb_url=_style_url(player.css_first(sel.roundvideo_thumb)),
                duration=duration,
            )
        else:
            item = Video(
                url=url,
                thumb_url=_style_url(player.css_first(sel.video_thumb)),
                duration=duration,
            )
        out.append(item)
    return out


def parse_voices(node: LexborNode, sel: Selectors) -> list[Media]:
    out: list[Media] = []
    for audio in node.css(sel.voice):
        src = audio.attributes.get("src")
        if not src:
            continue
        duration_node = node.css_first(sel.voice_duration)
        out.append(
            Voice(
                url=src,
                duration=clean_text(duration_node.text()) if duration_node is not None else None,
            )
        )
    return out


def parse_documents(node: LexborNode, sel: Selectors) -> list[Media]:
    out: list[Media] = []
    for doc in node.css(sel.document):
        title = _text_of(doc, sel.document_title)
        if title is None:
            continue
        out.append(DocumentRef(title=title, extra=_text_of(doc, sel.document_extra)))
    return out


def parse_stickers(node: LexborNode, sel: Selectors) -> list[Media]:
    out: list[Media] = []
    for sticker in node.css(sel.sticker):
        if sel.sticker_wrap_class in _classes(sticker):
            inner = sticker.css_first(sel.sticker_image)
            target = inner if inner is not None else sticker
        elif _has_ancestor_class(sticker, node, {sel.sticker_wrap_class}):
            continue  # already handled through its wrap
        else:
            target = sticker
        url = (
            target.attributes.get(sel.sticker_webp_attr)
            or _style_url(target)
            or (target.attributes.get("src") if target.tag == "img" else None)
        )
        out.append(Sticker(url=url, alt=target.attributes.get(sel.sticker_emoji_attr)))
    return out


def parse_polls(node: LexborNode, sel: Selectors) -> list[Media]:
    out: list[Media] = []
    for poll in node.css(sel.poll):
        options = []
        for option in poll.css(sel.poll_option):
            percent = option.css_first(sel.poll_option_percent)
            options.append(
                PollOption(
                    text=_text_of(option, sel.poll_option_text) or "",
                    percent=parse_count(percent.text()) if percent is not None else None,
                )
            )
        out.append(
            Poll(
                question=_text_of(poll, sel.poll_question) or "",
                kind=_text_of(poll, sel.poll_kind),
                options=options,
                voters=_text_of(node, sel.poll_voters),
            )
        )
    return out


def parse_link_previews(node: LexborNode, sel: Selectors) -> list[Media]:
    out: list[Media] = []
    for preview in node.css(sel.link_preview):
        out.append(
            LinkPreview(
                url=preview.attributes.get("href") or "",
                site_name=_text_of(preview, sel.link_preview_site_name),
                title=_text_of(preview, sel.link_preview_title),
                description=_text_of(preview, sel.link_preview_description),
                image_url=_style_url(preview.css_first(sel.link_preview_image)),
            )
        )
    return out


def parse_locations(node: LexborNode, sel: Selectors) -> list[Media]:
    out: list[Media] = []
    for wrap in node.css(sel.location):
        url = wrap.attributes.get("href")
        latitude, longitude = _coordinates(url)
        out.append(
            Location(
                url=url,
                image_url=_style_url(wrap.css_first(sel.location_image)),
                latitude=latitude,
                longitude=longitude,
            )
        )
    return out


def default_registry(selectors: Selectors | None = None) -> ParserRegistry:
    """A fresh registry with all built-in block parsers bound to the given
    selectors (defaults to :data:`DEFAULT_SELECTORS`)."""
    sel = selectors or DEFAULT_SELECTORS
    registry = ParserRegistry()
    registry.register("photo", partial(parse_photos, sel=sel))
    registry.register("video", partial(parse_videos, sel=sel))
    registry.register("voice", partial(parse_voices, sel=sel))
    registry.register("document", partial(parse_documents, sel=sel))
    registry.register("sticker", partial(parse_stickers, sel=sel))
    registry.register("poll", partial(parse_polls, sel=sel))
    registry.register("link_preview", partial(parse_link_previews, sel=sel))
    registry.register("location", partial(parse_locations, sel=sel))
    return registry


# ---------------------------------------------------------------------------
# message + feed parsing


def parse_message(
    node: LexborNode,
    registry: ParserRegistry,
    selectors: Selectors | None = None,
) -> Message | None:
    """Parse one message node. Returns None for nodes that carry no
    addressable post (service messages without a post id)."""
    sel = selectors or DEFAULT_SELECTORS

    data_post = node.attributes.get(sel.post_attr)
    if not data_post or "/" not in data_post:
        return None
    channel, _, msg_id_str = data_post.rpartition("/")
    if not msg_id_str.isdigit():
        return None
    msg_id = int(msg_id_str)

    date = None
    time_node = node.css_first(sel.date_time)
    if time_node is not None:
        raw = time_node.attributes.get(sel.datetime_attr)
        if raw:
            try:
                date = datetime.fromisoformat(raw)
            except ValueError:
                date = None

    views_node = node.css_first(sel.views)
    views_str = clean_text(views_node.text()) if views_node is not None else None

    text = html = markdown = None
    entities = []
    for candidate in node.css(sel.text):
        if _has_ancestor_class(candidate, node, sel.text_excluded_ancestor_classes):
            continue
        rich = extract_rich_text(candidate)
        text, html, markdown, entities = rich.text, rich.html, rich.markdown, rich.entities
        break

    forwarded = None
    fwd_node = node.css_first(sel.forward_name)
    if fwd_node is not None:
        forwarded = ForwardHeader(
            name=clean_text(fwd_node.text(deep=True)) or "",
            url=fwd_node.attributes.get("href"),
        )

    reply = None
    reply_node = node.css_first(sel.reply)
    if reply_node is not None:
        reply_url = reply_node.attributes.get("href")
        reply = ReplyHeader(
            author=_text_of(reply_node, sel.reply_author),
            text=_text_of(reply_node, sel.reply_text),
            url=reply_url,
            msg_id=_msg_id_from_url(reply_url),
        )

    reactions = []
    for reaction_node in node.css(sel.reaction):
        emoji_node = reaction_node.css_first(sel.reaction_emoji)
        emoji = clean_text(emoji_node.text(deep=True)) if emoji_node is not None else None
        count_str = _text_of(reaction_node, sel.reaction_count)
        if emoji:
            reactions.append(
                Reaction(
                    emoji=emoji,
                    count=parse_count(count_str),
                    count_str=count_str,
                    custom_emoji_id=(
                        emoji_node.attributes.get("emoji-id") if emoji_node is not None else None
                    ),
                )
            )

    comments_str = _text_of(node, sel.comments)

    return Message(
        id=msg_id,
        channel=channel,
        url=f"https://t.me/{channel}/{msg_id}",
        date=date,
        views=parse_count(views_str),
        views_str=views_str,
        author=_text_of(node, sel.author),
        text=text or "",
        html=html,
        markdown=markdown,
        entities=entities,
        media=registry.extract(node),
        forwarded_from=forwarded,
        reply_to=reply,
        edited=node.css_first(sel.edited) is not None,
        reactions=reactions,
        comments=parse_count(comments_str),
        comments_str=comments_str,
        raw_html=node.html or "",
    )


def parse_feed(
    html: str,
    registry: ParserRegistry,
    selectors: Selectors | None = None,
    *,
    strict: bool = False,
) -> list[Message]:
    """Parse a ``t.me/s/<channel>`` page (or fragment) into messages,
    in page order (oldest first)."""
    sel = selectors or DEFAULT_SELECTORS
    tree = LexborHTMLParser(html)
    messages = []
    candidates = 0
    for node in tree.css(sel.message):
        if sel.service_message_class in _classes(node):
            continue
        candidates += 1
        message = parse_message(node, registry, sel)
        if message is not None:
            messages.append(message)
    if strict and candidates and not messages:
        raise ParseError(f"found {candidates} message container(s), but none had a valid post id")
    return messages
