from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


def load_fixture(name: str) -> str:
    return (FIXTURES / name).read_text()


@pytest.fixture
def feed_html() -> str:
    return load_fixture("feed_page.html")


@pytest.fixture
def card_html() -> str:
    return load_fixture("card_page.html")


@pytest.fixture
def not_found_html() -> str:
    return load_fixture("not_found.html")


@pytest.fixture
def embed_html() -> str:
    return load_fixture("embed_message.html")


def msg_html(msg_id: int, text: str = "hi", channel: str = "testchan") -> str:
    """A minimal but structurally valid feed message."""
    return f"""
<div class="tgme_widget_message_wrap js-widget_message_wrap">
 <div class="tgme_widget_message js-widget_message" data-post="{channel}/{msg_id}">
  <div class="tgme_widget_message_bubble">
    <div class="tgme_widget_message_text js-message_text" dir="auto">{text}</div>
    <div class="tgme_widget_message_footer compact js-message_footer">
      <div class="tgme_widget_message_info short js-message_info">
        <span class="tgme_widget_message_views">10</span>
        <span class="tgme_widget_message_meta">
          <a class="tgme_widget_message_date" href="https://t.me/{channel}/{msg_id}">
            <time datetime="2026-07-15T10:00:00+00:00" class="time">10:00</time>
          </a>
        </span>
      </div>
    </div>
  </div>
 </div>
</div>
"""


def make_feed(*messages: str, channel: str = "testchan", title: str = "Test Channel") -> str:
    """A minimal /s/ feed page wrapping the given message HTML snippets."""
    return f"""<!DOCTYPE html>
<html><body>
<section class="tgme_channel_info">
  <div class="tgme_channel_info_header">
    <div class="tgme_channel_info_header_title_wrap">
      <div class="tgme_channel_info_header_title"><span dir="auto">{title}</span></div>
      <div class="tgme_channel_info_header_username"><a href="https://t.me/{channel}">@{channel}</a></div>
    </div>
  </div>
</section>
<section class="tgme_channel_history js-message_history">
{"".join(messages)}
</section>
</body></html>
"""
