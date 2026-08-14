from teleglance._utils import bg_image_url, clean_text, parse_count


def test_parse_count_plain():
    assert parse_count("215") == 215
    assert parse_count("12 345") == 12345
    assert parse_count("2 419 subscribers") == 2419
    assert parse_count("1,234") == 1234


def test_parse_count_suffixes():
    assert parse_count("36.6K") == 36600
    assert parse_count("1.2M") == 1_200_000
    assert parse_count("2B") == 2_000_000_000


def test_parse_count_garbage():
    assert parse_count(None) is None
    assert parse_count("") is None
    assert parse_count("no numbers") is None


def test_bg_image_url():
    assert (
        bg_image_url("width:400px;background-image:url('https://x.com/a.jpg')")
        == "https://x.com/a.jpg"
    )
    assert bg_image_url('background-image: url("https://x.com/b.png")') == "https://x.com/b.png"
    assert bg_image_url("background-image:url(https://x.com/c.gif)") == "https://x.com/c.gif"
    assert bg_image_url("color:red") is None
    assert bg_image_url(None) is None


def test_clean_text():
    assert clean_text("  a\n  b  ") == "a b"
    assert clean_text("   ") is None
    assert clean_text(None) is None
