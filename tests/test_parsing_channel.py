from teleglance.parsing import PageKind, classify_page, parse_channel


def test_classify(feed_html, card_html, not_found_html):
    assert classify_page(feed_html) == PageKind.FEED
    assert classify_page(card_html) == PageKind.CARD
    assert classify_page(not_found_html) == PageKind.UNKNOWN


def test_parse_channel_from_feed(feed_html):
    ch = parse_channel(feed_html, "testchan")
    assert ch is not None
    assert ch.username == "testchan"
    assert ch.url == "https://t.me/testchan"
    assert ch.title == "Test Channel"
    assert "Daily testing news" in ch.description
    assert "<b>testing</b>" in ch.description_html
    assert ch.avatar_url == "https://cdn4.telesco.pe/file/avatar123.jpg"
    assert ch.counts.subscribers == 36600
    assert ch.counts.photos == 1310
    assert ch.counts.videos == 512
    assert ch.counts.files == 83
    assert ch.counts.links == 2400
    assert ch.counts.raw["subscribers"] == "36.6K"


def test_parse_channel_from_card(card_html):
    ch = parse_channel(card_html, "privchan")
    assert ch is not None
    assert ch.username == "privchan"
    assert ch.title == "Private Channel"
    assert ch.description == "Members only. No previews."
    assert ch.avatar_url == "https://cdn4.telesco.pe/file/priv_avatar.jpg"
    assert ch.counts.subscribers == 2419


def test_parse_channel_nothing(not_found_html):
    assert parse_channel(not_found_html, "nope") is None
