import pytest
from selectolax.lexbor import LexborHTMLParser

from teleglance.models import Unsupported
from teleglance.parsing import ParserRegistry, default_registry, parse_feed


def _node(html):
    return LexborHTMLParser(html).css_first("div")


def test_register_and_extract():
    registry = ParserRegistry()
    registry.register("custom", lambda node: [Unsupported(raw_html=node.html or "")])
    media = registry.extract(_node("<div>x</div>"))
    assert len(media) == 1
    assert isinstance(media[0], Unsupported)


def test_register_duplicate_requires_override():
    registry = ParserRegistry()
    registry.register("a", lambda node: [])
    with pytest.raises(ValueError):
        registry.register("a", lambda node: [])
    registry.register("a", lambda node: [], override=True)  # ok


def test_failing_parser_does_not_break_others(feed_html, caplog):
    registry = default_registry()

    def broken(node):
        raise RuntimeError("markup changed under us")

    registry.register("broken", broken)
    messages = parse_feed(feed_html, registry)
    # all messages still parse, media from healthy parsers intact
    assert any(m.media for m in messages)
    assert any("broken" in r.message for r in caplog.records)


def test_copy_is_independent():
    base = default_registry()
    clone = base.copy()
    clone.unregister("photo")
    assert "photo" in base.names()
    assert "photo" not in clone.names()
