"""Markup-drift resilience: adapting to changed t.me structure must only
require a Selectors override, never parser changes."""

import httpx
import pytest
import respx

from teleglance import DEFAULT_SELECTORS, Selectors, TeleGlanceClient
from teleglance.models import Photo
from teleglance.parsing import default_registry, parse_feed

# A hypothetical future t.me markup: text and photo classes renamed.
DRIFTED_FEED = """<!DOCTYPE html>
<html><body>
<section class="tgme_channel_info">
  <div class="tgme_channel_info_header">
    <div class="tgme_channel_info_header_title"><span dir="auto">Test Channel</span></div>
    <div class="tgme_channel_info_header_username"><a href="https://t.me/testchan">@testchan</a></div>
  </div>
</section>
<section class="tgme_channel_history">
<div class="tgme_widget_message" data-post="testchan/201">
  <a class="tgme_widget_message_photo_box" style="background-image:url('https://cdn4.telesco.pe/file/new.jpg')"></a>
  <div class="tgme_widget_message_body" dir="auto">drifted markup text</div>
  <span class="tgme_widget_message_views">5</span>
  <time datetime="2026-07-16T10:00:00+00:00"></time>
</div>
</section>
</body></html>
"""

DRIFTED = DEFAULT_SELECTORS.replace(
    text=".tgme_widget_message_body",
    photo="a.tgme_widget_message_photo_box",
)


def test_default_selectors_miss_drifted_markup():
    messages = parse_feed(DRIFTED_FEED, default_registry())
    assert len(messages) == 1
    assert messages[0].text == ""  # body class unknown to defaults
    assert messages[0].media == []
    assert messages[0].raw_html  # ...but nothing is lost


def test_replace_adapts_without_code_changes():
    messages = parse_feed(DRIFTED_FEED, default_registry(DRIFTED), DRIFTED)
    assert messages[0].text == "drifted markup text"
    (photo,) = messages[0].media
    assert isinstance(photo, Photo)
    assert photo.url == "https://cdn4.telesco.pe/file/new.jpg"


def test_from_dict_applies_overrides_on_defaults():
    sel = Selectors.from_dict({"text": ".tgme_widget_message_body"})
    assert sel.text == ".tgme_widget_message_body"
    assert sel.photo == DEFAULT_SELECTORS.photo  # untouched fields keep defaults


def test_from_dict_rejects_unknown_fields():
    with pytest.raises(ValueError, match="tpyo"):
        Selectors.from_dict({"tpyo": ".x"})


@respx.mock
async def test_client_threads_selectors_everywhere():
    respx.get("https://t.me/s/testchan").mock(return_value=httpx.Response(200, text=DRIFTED_FEED))
    async with TeleGlanceClient(rate_limit=0, retries=0, selectors=DRIFTED) as client:
        (message,) = await client.get_messages("testchan")
        channel = await client.get_channel("testchan")
    assert message.text == "drifted markup text"
    assert message.media[0].url == "https://cdn4.telesco.pe/file/new.jpg"
    assert channel.title == "Test Channel"
