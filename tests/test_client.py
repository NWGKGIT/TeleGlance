import httpx
import pytest
import respx

from teleglance import (
    ChannelNotFound,
    ChannelPrivate,
    DownloadError,
    MessageNotFound,
    Photo,
    TeleGlanceClient,
)
from teleglance.models import DocumentRef

from conftest import make_feed, msg_html


def client(**kw):
    kw.setdefault("rate_limit", 0)
    kw.setdefault("retries", 0)
    return TeleGlanceClient(**kw)


# -- channel ----------------------------------------------------------------


@respx.mock
async def test_get_channel(feed_html):
    respx.get("https://t.me/s/testchan").mock(return_value=httpx.Response(200, text=feed_html))
    async with client() as c:
        channel = await c.get_channel("@testchan")
    assert channel.username == "testchan"
    assert channel.counts.subscribers == 36600


@respx.mock
async def test_get_channel_falls_back_to_card(card_html):
    respx.get("https://t.me/s/privchan").mock(return_value=httpx.Response(200, text=card_html))
    async with client() as c:
        channel = await c.get_channel("privchan")
    assert channel.title == "Private Channel"


@respx.mock
async def test_channel_not_found(not_found_html):
    respx.get("https://t.me/s/nope").mock(return_value=httpx.Response(200, text=not_found_html))
    async with client() as c:
        with pytest.raises(ChannelNotFound):
            await c.get_channel("nope")
        with pytest.raises(ChannelNotFound):
            await c.get_messages("nope")


@respx.mock
async def test_messages_private_channel(card_html):
    respx.get("https://t.me/s/privchan").mock(return_value=httpx.Response(200, text=card_html))
    async with client() as c:
        with pytest.raises(ChannelPrivate):
            await c.get_messages("privchan")


# -- messages ---------------------------------------------------------------


@respx.mock
async def test_get_messages_passes_cursor_params(feed_html):
    route = respx.get("https://t.me/s/testchan").mock(
        return_value=httpx.Response(200, text=feed_html)
    )
    async with client() as c:
        await c.get_messages("testchan", before=250, query="news")
    params = route.calls.last.request.url.params
    assert params["before"] == "250"
    assert params["q"] == "news"


@respx.mock
async def test_iter_messages_paginates_newest_first(feed_html):
    page2 = make_feed(msg_html(95), msg_html(96))
    empty = make_feed()

    def feed(request):
        before = request.url.params.get("before")
        if before is None:
            return httpx.Response(200, text=feed_html)
        if before == "101":
            return httpx.Response(200, text=page2)
        return httpx.Response(200, text=empty)

    respx.get("https://t.me/s/testchan").mock(side_effect=feed)
    async with client() as c:
        ids = [m.id async for m in c.iter_messages("testchan")]
    assert ids == [110, 108, 107, 106, 105, 104, 103, 102, 101, 96, 95]


@respx.mock
async def test_iter_messages_limit(feed_html):
    respx.get("https://t.me/s/testchan").mock(return_value=httpx.Response(200, text=feed_html))
    async with client() as c:
        ids = [m.id async for m in c.iter_messages("testchan", limit=3)]
    assert ids == [110, 108, 107]


@respx.mock
async def test_iter_messages_stops_without_progress(feed_html):
    # server keeps returning the same page for any cursor: must not loop forever
    respx.get("https://t.me/s/testchan").mock(return_value=httpx.Response(200, text=feed_html))
    async with client() as c:
        ids = [m.id async for m in c.iter_messages("testchan")]
    assert ids.count(110) == 1


@respx.mock
async def test_get_message(embed_html):
    respx.get("https://t.me/testchan/42").mock(return_value=httpx.Response(200, text=embed_html))
    async with client() as c:
        message = await c.get_message("testchan", 42)
    assert message.id == 42
    assert message.text == "Single embedded message"


@respx.mock
async def test_get_message_not_found(not_found_html):
    respx.get("https://t.me/testchan/999").mock(
        return_value=httpx.Response(200, text=not_found_html)
    )
    async with client() as c:
        with pytest.raises(MessageNotFound):
            await c.get_message("testchan", 999)


@respx.mock
async def test_search_uses_query(feed_html):
    route = respx.get("https://t.me/s/testchan").mock(
        return_value=httpx.Response(200, text=feed_html)
    )
    async with client() as c:
        _ = [m async for m in c.search("testchan", "httpx", limit=2)]
    assert route.calls.last.request.url.params["q"] == "httpx"


# -- watch ------------------------------------------------------------------


@respx.mock
async def test_watch_yields_only_new_messages(feed_html):
    fresh = make_feed(msg_html(111, "first new"), msg_html(112, "second new"))

    def feed(request):
        after = request.url.params.get("after")
        if after is None:
            return httpx.Response(200, text=feed_html)  # establishes since_id=110
        return httpx.Response(200, text=fresh)

    respx.get("https://t.me/s/testchan").mock(side_effect=feed)
    async with client() as c:
        got = []
        async for message in c.watch("testchan", interval=0):
            got.append(message)
            if len(got) == 2:
                break
    assert [m.id for m in got] == [111, 112]
    assert got[0].text == "first new"


# -- media ------------------------------------------------------------------


@respx.mock
async def test_download_media_to_dir(tmp_path):
    respx.get("https://cdn4.telesco.pe/file/photo_a.jpg").mock(
        return_value=httpx.Response(200, content=b"JPEG", headers={"Content-Type": "image/jpeg"})
    )
    async with client() as c:
        path = await c.download_media(Photo(url="https://cdn4.telesco.pe/file/photo_a.jpg"), tmp_path)
    assert path == tmp_path / "photo_a.jpg"
    assert path.read_bytes() == b"JPEG"


@respx.mock
async def test_download_media_extension_from_content_type(tmp_path):
    respx.get("https://cdn.example.org/file/abc123").mock(
        return_value=httpx.Response(200, content=b"MP4", headers={"Content-Type": "video/mp4"})
    )
    async with client() as c:
        path = await c.download_media("https://cdn.example.org/file/abc123", tmp_path)
    assert path.suffix == ".mp4"
    assert path.read_bytes() == b"MP4"


@respx.mock
async def test_download_bytes():
    respx.get("https://cdn.example.org/x.ogg").mock(
        return_value=httpx.Response(200, content=b"OGG")
    )
    async with client() as c:
        data = await c.download_bytes("https://cdn.example.org/x.ogg")
    assert data == b"OGG"


async def test_download_document_raises():
    async with client() as c:
        with pytest.raises(DownloadError):
            await c.download_media(DocumentRef(title="a.pdf"))


@respx.mock
async def test_download_http_error(tmp_path):
    respx.get("https://cdn.example.org/gone.jpg").mock(return_value=httpx.Response(404))
    async with client() as c:
        with pytest.raises(DownloadError):
            await c.download_media("https://cdn.example.org/gone.jpg", tmp_path)
