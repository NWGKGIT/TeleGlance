"""Pluggable media-block parsers.

A block parser is a callable that receives the whole message node and returns
the media objects it recognizes (or an empty list). The registry runs every
parser over every message; a parser that raises is logged and skipped rather
than failing the message, so markup drift in one block type never takes down
the rest.

Extending without forking::

    from teleglance.parsing import default_registry

    registry = default_registry()

    def parse_gift(node):  # hypothetical new t.me block
        block = node.css_first(".tgme_widget_message_gift")
        return [Unsupported(raw_html=block.html)] if block else []

    registry.register("gift", parse_gift)
    client = TeleGlanceClient(registry=registry)
"""

from __future__ import annotations

import logging
from collections.abc import Callable

from selectolax.lexbor import LexborNode

from ..models.media import Media

logger = logging.getLogger("teleglance")

BlockParser = Callable[[LexborNode], list[Media]]


class ParserRegistry:
    def __init__(self) -> None:
        self._parsers: dict[str, BlockParser] = {}

    def register(self, name: str, parser: BlockParser, *, override: bool = False) -> None:
        if name in self._parsers and not override:
            raise ValueError(f"parser {name!r} already registered (pass override=True)")
        self._parsers[name] = parser

    def unregister(self, name: str) -> None:
        self._parsers.pop(name, None)

    def names(self) -> list[str]:
        return list(self._parsers)

    def copy(self) -> ParserRegistry:
        clone = ParserRegistry()
        clone._parsers = dict(self._parsers)
        return clone

    def extract(self, message_node: LexborNode) -> list[Media]:
        media: list[Media] = []
        for name, parser in self._parsers.items():
            try:
                media.extend(parser(message_node) or [])
            except Exception:
                logger.warning("block parser %r failed on a message", name, exc_info=True)
        return media
