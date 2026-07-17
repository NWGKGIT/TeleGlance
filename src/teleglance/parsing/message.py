"""Parsers for message nodes on t.me preview pages."""

from __future__ import annotations

from datetime import datetime

from selectolax.lexbor import LexborHTMLParser, LexborNode

from .._utils import bg_image_url, clean_text, parse_count
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
    ReplyHeader,
    RoundVideo,
    Sticker,
    Video,
    Voice,
)
from .entities import extract_rich_text
from .registry import ParserRegistry

# ---------------------------------------------------------------------------
# helpers


def _style_url(node: LexborNode | None) -> str | None:
    return bg_image_url(node.attributes.get("style")) if node is not None else None


def _has_ancestor_class(node: LexborNode, stop: LexborNode, classes: set[str]) -> bool:
    parent = node.parent
    while parent is not None and parent is not stop:
        parent_classes = (parent.attributes.get("class") or "").split()
        if any(c in classes for c in parent_classes):
            return True
        parent = parent.parent
    return False


def _msg_id_from_url(url: str | None) -> int | None:
    if not url:
        return None
    tail = url.rstrip("/").rsplit("/", 1)[-1].split("?", 1)[0]
    return int(tail) if tail.isdigit() else None


# ---------------------------------------------------------------------------
# built-in block parsers (all take the whole message node)


def parse_photos(node: LexborNode) -> list[Media]:
    out: list[Media] = []
    for wrap in node.css("a.tgme_widget_message_photo_wrap"):
        url = _style_url(wrap)
        if url:
            out.append(Photo(url=url))
    return out


def parse_videos(node: LexborNode) -> list[Media]:
    out: list[Media] = []
    for player in node.css(".tgme_widget_message_video_player"):
        video = player.css_first("video")
        classes = (video.attributes.get("class") or "") if video is not None else ""
        duration = player.css_first("time")
        item: Media
        if "roundvideo" in classes or player.css_first(".tgme_widget_message_roundvideo") is not None:
            item = RoundVideo(
                url=video.attributes.get("src") if video is not None else None,
                thumb_url=_style_url(player.css_first(".tgme_widget_message_roundvideo_thumb")),
                duration=clean_text(duration.text()) if duration is not None else None,
            )
        else:
            item = Video(
                url=video.attributes.get("src") if video is not None else None,
                thumb_url=_style_url(player.css_first(".tgme_widget_message_video_thumb")),
                duration=clean_text(duration.text()) if duration is not None else None,
            )
        out.append(item)
    return out


def parse_voices(node: LexborNode) -> list[Media]:
    out: list[Media] = []
    for audio in node.css("audio.tgme_widget_message_voice"):
        src = audio.attributes.get("src")
        if not src:
            continue
        duration = node.css_first("time.tgme_widget_message_voice_duration")
        out.append(
            Voice(url=src, duration=clean_text(duration.text()) if duration is not None else None)
        )
    return out


def parse_documents(node: LexborNode) -> list[Media]:
    out: list[Media] = []
    for doc in node.css(".tgme_widget_message_document"):
        title = doc.css_first(".tgme_widget_message_document_title")
        extra = doc.css_first(".tgme_widget_message_document_extra")
        if title is None:
            continue
        out.append(
            DocumentRef(
                title=clean_text(title.text(deep=True)) or "",
                extra=clean_text(extra.text(deep=True)) if extra is not None else None,
            )
        )
    return out


def parse_stickers(node: LexborNode) -> list[Media]:
    out: list[Media] = []
    for sticker in node.css(".tgme_widget_message_sticker_wrap, .tgme_widget_message_sticker"):
        classes = (sticker.attributes.get("class") or "").split()
        if "tgme_widget_message_sticker_wrap" in classes:
            inner = sticker.css_first(".tgme_widget_message_sticker")
            target = inner if inner is not None else sticker
        elif _has_ancestor_class(sticker, node, {"tgme_widget_message_sticker_wrap"}):
            continue  # already handled through its wrap
        else:
            target = sticker
        url = (
            target.attributes.get("data-webp")
            or _style_url(target)
            or (target.attributes.get("src") if target.tag == "img" else None)
        )
        out.append(Sticker(url=url, alt=target.attributes.get("data-sticker-emoji")))
    return out


def parse_polls(node: LexborNode) -> list[Media]:
    out: list[Media] = []
    for poll in node.css(".tgme_widget_message_poll"):
        question = poll.css_first(".tgme_widget_message_poll_question")
        kind = poll.css_first(".tgme_widget_message_poll_type")
        options = []
        for option in poll.css(".tgme_widget_message_poll_option"):
            text = option.css_first(".tgme_widget_message_poll_option_text")
            percent = option.css_first(".tgme_widget_message_poll_option_percent")
            percent_value = parse_count(percent.text()) if percent is not None else None
            options.append(
                PollOption(
                    text=clean_text(text.text(deep=True)) or "" if text is not None else "",
                    percent=percent_value,
                )
            )
        voters = node.css_first(".tgme_widget_message_voters")
        out.append(
            Poll(
                question=clean_text(question.text(deep=True)) or "" if question is not None else "",
                kind=clean_text(kind.text()) if kind is not None else None,
                options=options,
                voters=clean_text(voters.text()) if voters is not None else None,
            )
        )
    return out


def parse_link_previews(node: LexborNode) -> list[Media]:
    out: list[Media] = []
    for preview in node.css("a.tgme_widget_message_link_preview"):
        image = preview.css_first(".link_preview_image, .link_preview_right_image")
        site = preview.css_first(".link_preview_site_name")
        title = preview.css_first(".link_preview_title")
        description = preview.css_first(".link_preview_description")
        out.append(
            LinkPreview(
                url=preview.attributes.get("href") or "",
                site_name=clean_text(site.text(deep=True)) if site is not None else None,
                title=clean_text(title.text(deep=True)) if title is not None else None,
                description=clean_text(description.text(deep=True))
                if description is not None
                else None,
                image_url=_style_url(image),
            )
        )
    return out


def parse_locations(node: LexborNode) -> list[Media]:
    out: list[Media] = []
    for wrap in node.css("a.tgme_widget_message_location_wrap"):
        out.append(
            Location(
                url=wrap.attributes.get("href"),
                image_url=_style_url(wrap.css_first(".tgme_widget_message_location")),
            )
        )
    return out


def default_registry() -> ParserRegistry:
    """A fresh registry with all built-in block parsers."""
    registry = ParserRegistry()
    registry.register("photo", parse_photos)
    registry.register("video", parse_videos)
    registry.register("voice", parse_voices)
    registry.register("document", parse_documents)
    registry.register("sticker", parse_stickers)
    registry.register("poll", parse_polls)
    registry.register("link_preview", parse_link_previews)
    registry.register("location", parse_locations)
    return registry


# ---------------------------------------------------------------------------
# message + feed parsing


def parse_message(node: LexborNode, registry: ParserRegistry) -> Message | None:
    """Parse one ``.tgme_widget_message`` node. Returns None for nodes that
    carry no addressable post (service messages without a data-post id)."""
    data_post = node.attributes.get("data-post")
    if not data_post or "/" not in data_post:
        return None
    channel, _, msg_id_str = data_post.rpartition("/")
    if not msg_id_str.isdigit():
        return None
    msg_id = int(msg_id_str)

    date = None
    time_node = node.css_first(".tgme_widget_message_date time, time")
    if time_node is not None:
        raw = time_node.attributes.get("datetime")
        if raw:
            try:
                date = datetime.fromisoformat(raw)
            except ValueError:
                date = None

    views_node = node.css_first(".tgme_widget_message_views")
    views_str = clean_text(views_node.text()) if views_node is not None else None

    author_node = node.css_first(".tgme_widget_message_from_author")
    author = clean_text(author_node.text(deep=True)) if author_node is not None else None

    text = html = markdown = None
    entities = []
    for candidate in node.css(".tgme_widget_message_text"):
        if _has_ancestor_class(
            candidate,
            node,
            {"tgme_widget_message_reply", "tgme_widget_message_link_preview"},
        ):
            continue
        rich = extract_rich_text(candidate)
        text, html, markdown, entities = rich.text, rich.html, rich.markdown, rich.entities
        break

    forwarded = None
    fwd_node = node.css_first(".tgme_widget_message_forwarded_from_name")
    if fwd_node is not None:
        forwarded = ForwardHeader(
            name=clean_text(fwd_node.text(deep=True)) or "",
            url=fwd_node.attributes.get("href"),
        )

    reply = None
    reply_node = node.css_first("a.tgme_widget_message_reply")
    if reply_node is not None:
        reply_author = reply_node.css_first(".tgme_widget_message_author_name")
        reply_text = reply_node.css_first(
            ".tgme_widget_message_reply_text, .tgme_widget_message_metatext, .tgme_widget_message_text"
        )
        reply_url = reply_node.attributes.get("href")
        reply = ReplyHeader(
            author=clean_text(reply_author.text(deep=True)) if reply_author is not None else None,
            text=clean_text(reply_text.text(deep=True)) if reply_text is not None else None,
            url=reply_url,
            msg_id=_msg_id_from_url(reply_url),
        )

    return Message(
        id=msg_id,
        channel=channel,
        url=f"https://t.me/{channel}/{msg_id}",
        date=date,
        views=parse_count(views_str),
        views_str=views_str,
        author=author,
        text=text or "",
        html=html,
        markdown=markdown,
        entities=entities,
        media=registry.extract(node),
        forwarded_from=forwarded,
        reply_to=reply,
        raw_html=node.html or "",
    )


def parse_feed(html: str, registry: ParserRegistry) -> list[Message]:
    """Parse a ``t.me/s/<channel>`` page (or fragment) into messages,
    in page order (oldest first)."""
    tree = LexborHTMLParser(html)
    messages = []
    for node in tree.css(".tgme_widget_message"):
        classes = (node.attributes.get("class") or "").split()
        if "service_message" in classes:
            continue
        message = parse_message(node, registry)
        if message is not None:
            messages.append(message)
    return messages
