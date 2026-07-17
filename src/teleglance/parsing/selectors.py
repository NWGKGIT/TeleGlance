"""Every structural assumption about t.me markup, in one place.

When Telegram changes the preview markup, this file is where you fix it —
the parsers contain no hard-coded class names. Three ways to adapt, cheapest
first:

1. Runtime override, no library change::

       from teleglance import DEFAULT_SELECTORS, TeleGlanceClient

       selectors = DEFAULT_SELECTORS.replace(views=".tgme_widget_message_view_count")
       client = TeleGlanceClient(selectors=selectors)

2. Config-driven override (e.g. ship selector updates without a release)::

       selectors = Selectors.from_dict(json.load(open("selectors.json")))

3. Edit the defaults below and add a fixture that captures the new markup.

Fields are CSS selector strings unless suffixed ``_attr`` (an HTML attribute
name) or ``_class`` (a bare class name checked against ``class`` attributes).
Comma-separated selectors act as fallback chains — first match wins.
"""

from __future__ import annotations

import dataclasses
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class Selectors:
    # -- message container --------------------------------------------------
    message: str = ".tgme_widget_message"
    service_message_class: str = "service_message"
    post_attr: str = "data-post"  # holds "channel/msg_id"
    date_time: str = ".tgme_widget_message_date time, time"
    datetime_attr: str = "datetime"
    views: str = ".tgme_widget_message_views"
    author: str = ".tgme_widget_message_from_author"

    # -- message text -------------------------------------------------------
    text: str = ".tgme_widget_message_text"
    # a text node inside any of these classes is quoted/preview content,
    # not the message body
    text_excluded_ancestor_classes: frozenset[str] = frozenset(
        {"tgme_widget_message_reply", "tgme_widget_message_link_preview"}
    )

    # -- forward / reply headers -------------------------------------------
    forward_name: str = ".tgme_widget_message_forwarded_from_name"
    reply: str = "a.tgme_widget_message_reply"
    reply_author: str = ".tgme_widget_message_author_name"
    reply_text: str = (
        ".tgme_widget_message_reply_text, .tgme_widget_message_metatext, .tgme_widget_message_text"
    )

    # -- media blocks -------------------------------------------------------
    photo: str = "a.tgme_widget_message_photo_wrap"
    video_player: str = ".tgme_widget_message_video_player"
    video: str = "video"
    video_thumb: str = ".tgme_widget_message_video_thumb"
    video_duration: str = "time"
    roundvideo_class: str = "roundvideo"  # class-substring marking round videos
    roundvideo: str = ".tgme_widget_message_roundvideo"
    roundvideo_thumb: str = ".tgme_widget_message_roundvideo_thumb"
    voice: str = "audio.tgme_widget_message_voice"
    voice_duration: str = "time.tgme_widget_message_voice_duration"
    document: str = ".tgme_widget_message_document"
    document_title: str = ".tgme_widget_message_document_title"
    document_extra: str = ".tgme_widget_message_document_extra"
    sticker: str = ".tgme_widget_message_sticker_wrap, .tgme_widget_message_sticker"
    sticker_wrap_class: str = "tgme_widget_message_sticker_wrap"
    sticker_image: str = ".tgme_widget_message_sticker"
    sticker_emoji_attr: str = "data-sticker-emoji"
    sticker_webp_attr: str = "data-webp"
    poll: str = ".tgme_widget_message_poll"
    poll_question: str = ".tgme_widget_message_poll_question"
    poll_kind: str = ".tgme_widget_message_poll_type"
    poll_option: str = ".tgme_widget_message_poll_option"
    poll_option_percent: str = ".tgme_widget_message_poll_option_percent"
    poll_option_text: str = ".tgme_widget_message_poll_option_text"
    poll_voters: str = ".tgme_widget_message_voters"
    link_preview: str = "a.tgme_widget_message_link_preview"
    link_preview_image: str = ".link_preview_image, .link_preview_right_image"
    link_preview_site_name: str = ".link_preview_site_name"
    link_preview_title: str = ".link_preview_title"
    link_preview_description: str = ".link_preview_description"
    location: str = "a.tgme_widget_message_location_wrap"
    location_image: str = ".tgme_widget_message_location"

    # -- channel info (on /s/ feed pages) ----------------------------------
    channel_info: str = ".tgme_channel_info"
    channel_title: str = ".tgme_channel_info_header_title"
    channel_username: str = ".tgme_channel_info_header_username a"
    channel_description: str = ".tgme_channel_info_description"
    channel_avatar: str = ".tgme_page_photo_image img, img.tgme_page_photo_image, img"
    channel_counter: str = ".tgme_channel_info_counter"
    counter_value: str = ".counter_value"
    counter_type: str = ".counter_type"

    # -- profile card (plain t.me/<name> pages) -----------------------------
    card_title: str = ".tgme_page_title"
    card_description: str = ".tgme_page_description"
    card_extra: str = ".tgme_page_extra"
    card_avatar: str = ".tgme_page_photo_image img, img.tgme_page_photo_image"

    def replace(self, **overrides: Any) -> Selectors:
        """A copy with the given fields changed."""
        return dataclasses.replace(self, **overrides)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Selectors:
        """Defaults plus overrides from a plain dict (e.g. loaded from JSON).
        Unknown keys raise, so typos in a config file fail loudly."""
        known = {f.name for f in dataclasses.fields(cls)}
        unknown = set(data) - known
        if unknown:
            raise ValueError(f"unknown selector fields: {sorted(unknown)}")
        coerced = dict(data)
        if "text_excluded_ancestor_classes" in coerced:
            coerced["text_excluded_ancestor_classes"] = frozenset(
                coerced["text_excluded_ancestor_classes"]
            )
        return cls(**coerced)


DEFAULT_SELECTORS = Selectors()
