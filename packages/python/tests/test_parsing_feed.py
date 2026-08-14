from datetime import datetime, timezone

import pytest

from teleglance import ParseError
from teleglance.models import (
    DocumentRef,
    LinkPreview,
    Location,
    Photo,
    Poll,
    Sticker,
    Video,
    Voice,
)
from teleglance.parsing import default_registry, parse_feed


@pytest.fixture
def messages(feed_html):
    return {m.id: m for m in parse_feed(feed_html, default_registry())}


def test_feed_message_ids_and_service_skip(messages):
    # 109 is a service message and must be skipped
    assert sorted(messages) == [101, 102, 103, 104, 105, 106, 107, 108, 110]


def test_basic_fields(messages):
    m = messages[101]
    assert m.channel == "testchan"
    assert m.url == "https://t.me/testchan/101"
    assert m.date == datetime(2026, 7, 15, 10, 0, tzinfo=timezone.utc)
    assert m.views == 1200
    assert m.views_str == "1.2K"
    assert m.raw_html.startswith("<div")


def test_rich_text_and_entities(messages):
    m = messages[101]
    assert m.text.startswith("Hello bold and italic and a link plus @durov and #news")
    assert "\nhidden inline_code()" in m.text

    by_type = {}
    for e in m.entities:
        by_type.setdefault(e.type, []).append(e)
    # every entity span must be consistent with the plain text
    for e in m.entities:
        assert 0 <= e.offset and e.offset + e.length <= len(m.text)

    def span(e):
        return m.text[e.offset : e.offset + e.length]

    assert span(by_type["bold"][0]) == "bold"
    assert span(by_type["italic"][0]) == "italic"
    assert span(by_type["link"][0]) == "a link"
    assert by_type["link"][0].url == "https://example.com/page"
    assert span(by_type["mention"][0]) == "@durov"
    assert span(by_type["hashtag"][0]) == "#news"
    assert span(by_type["emoji"][0]) == "😄"
    assert span(by_type["spoiler"][0]) == "hidden"
    assert span(by_type["code"][0]) == "inline_code()"


def test_markdown_rendering(messages):
    md = messages[101].markdown
    assert "**bold**" in md
    assert "*italic*" in md
    assert "[a link](https://example.com/page)" in md
    assert "||hidden||" in md
    assert "`inline_code()`" in md
    assert "@durov" in md  # mentions stay as text


def test_forward_header(messages):
    fwd = messages[101].forwarded_from
    assert fwd is not None
    assert fwd.name == "Original Channel"
    assert fwd.url == "https://t.me/original_chan"


def test_photo_album(messages):
    photos = [m for m in messages[102].media if isinstance(m, Photo)]
    assert [p.url for p in photos] == [
        "https://cdn4.telesco.pe/file/photo_a.jpg",
        "https://cdn4.telesco.pe/file/photo_b.jpg",
    ]
    assert messages[102].text == "Album caption"


def test_video(messages):
    (video,) = [m for m in messages[103].media if isinstance(m, Video)]
    assert video.url == "https://cdn4.telesco.pe/file/video103.mp4"
    assert video.thumb_url == "https://cdn4.telesco.pe/file/thumb103.jpg"
    assert video.duration == "0:42"


def test_voice_and_author(messages):
    (voice,) = [m for m in messages[104].media if isinstance(m, Voice)]
    assert voice.url == "https://cdn4.telesco.pe/file/voice104.ogg"
    assert voice.duration == "1:23"
    assert messages[104].author == "Alice"


def test_document(messages):
    (doc,) = [m for m in messages[105].media if isinstance(m, DocumentRef)]
    assert doc.title == "report-final.pdf"
    assert doc.extra == "2.3 MB"


def test_poll(messages):
    (poll,) = [m for m in messages[106].media if isinstance(m, Poll)]
    assert poll.question == "Best async HTTP client?"
    assert poll.kind == "Anonymous Poll"
    assert [(o.text, o.percent) for o in poll.options] == [("httpx", 64), ("aiohttp", 36)]
    assert poll.voters == "4.1K"


def test_link_preview_not_message_text(messages):
    m = messages[107]
    (preview,) = [x for x in m.media if isinstance(x, LinkPreview)]
    assert preview.url == "https://github.com/example/repo"
    assert preview.site_name == "GitHub"
    assert preview.title == "example/repo"
    assert preview.description.startswith("An example repository.")
    assert preview.image_url == "https://cdn4.telesco.pe/file/preview107.jpg"
    # nested .tgme_widget_message_text inside the preview must not leak
    assert m.text == "Check this out: https://github.com/example/repo"


def test_sticker(messages):
    (sticker,) = [m for m in messages[108].media if isinstance(m, Sticker)]
    assert sticker.url == "https://cdn4.telesco.pe/file/sticker108.webp"
    assert sticker.alt == "🎉"


def test_reply_and_location(messages):
    m = messages[110]
    assert m.reply_to is not None
    assert m.reply_to.author == "Test Channel"
    assert m.reply_to.msg_id == 101
    assert m.reply_to.url == "https://t.me/testchan/101"
    assert m.reply_to.text.startswith("Hello bold")
    (location,) = [x for x in m.media if isinstance(x, Location)]
    assert location.url == "https://maps.google.com/maps?q=48.85,2.35"
    assert location.image_url == "https://cdn4.telesco.pe/file/map110.jpg"
    assert location.latitude == 48.85
    assert location.longitude == 2.35
    assert m.text == "We are here"


def test_serialization_roundtrip(messages):
    from teleglance.models import Message

    for m in messages.values():
        again = Message.model_validate_json(m.model_dump_json())
        assert again == m


def test_reactions_comments_and_edited_metadata():
    html = """
    <div class="tgme_widget_message" data-post="testchan/200">
      <span class="tgme_widget_message_edited">edited</span>
      <div class="tgme_widget_message_reactions">
        <span class="tgme_widget_message_reaction">
          <i class="emoji">👍</i><span class="counter">1.2K</span>
        </span>
        <span class="tgme_widget_message_reaction">
          <tg-emoji emoji-id="custom-1">🔥</tg-emoji>
          <span class="counter">9</span>
        </span>
      </div>
      <a class="tgme_widget_message_replies">34 comments</a>
    </div>
    """
    (message,) = parse_feed(html, default_registry())
    assert message.edited is True
    assert [(reaction.emoji, reaction.count) for reaction in message.reactions] == [
        ("👍", 1200),
        ("🔥", 9),
    ]
    assert message.reactions[1].custom_emoji_id == "custom-1"
    assert message.comments == 34
    assert message.comments_str == "34 comments"


def test_strict_feed_detects_unaddressable_message():
    html = '<div class="tgme_widget_message"><p>drifted</p></div>'
    assert parse_feed(html, default_registry()) == []
    with pytest.raises(ParseError):
        parse_feed(html, default_registry(), strict=True)
