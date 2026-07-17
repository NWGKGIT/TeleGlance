"""Rich-text extraction: message HTML → plain text + entities + markdown.

The walker recurses through the ``tgme_widget_message_text`` node, accumulating
plain text while recording formatting spans as :class:`Entity` objects (offsets
in codepoints over the plain text) and rendering a lossy markdown equivalent
(GitHub-style, plus ``||spoiler||`` and ``<u>underline</u>``).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from selectolax.lexbor import LexborNode

from ..models import Entity


@dataclass
class RichText:
    text: str = ""
    html: str = ""
    markdown: str = ""
    entities: list[Entity] = field(default_factory=list)


_SIMPLE_TAGS: dict[str, tuple[str, str]] = {
    # tag -> (entity type, markdown marker)
    "b": ("bold", "**"),
    "strong": ("bold", "**"),
    "em": ("italic", "*"),
    "u": ("underline", ""),
    "ins": ("underline", ""),
    "s": ("strikethrough", "~~"),
    "del": ("strikethrough", "~~"),
    "strike": ("strikethrough", "~~"),
    "tg-spoiler": ("spoiler", "||"),
}


class _Walker:
    def __init__(self) -> None:
        self._parts: list[str] = []
        self._length = 0
        self.entities: list[Entity] = []

    def _emit(self, text: str) -> None:
        self._parts.append(text)
        self._length += len(text)

    @property
    def text(self) -> str:
        return "".join(self._parts)

    def walk_children(self, node: LexborNode) -> str:
        markdown: list[str] = []
        for child in node.iter(include_text=True):
            markdown.append(self.walk(child))
        return "".join(markdown)

    def walk(self, node: LexborNode) -> str:  # noqa: PLR0911 - tag dispatch
        tag = node.tag
        if tag == "-text":
            text = node.text(deep=True)
            self._emit(text)
            return text
        if tag == "br":
            self._emit("\n")
            return "\n"

        classes = (node.attributes.get("class") or "").split()

        if tag == "i" and "emoji" in classes:
            # Standard emoji: <i class="emoji" style="..."><b>😄</b></i>
            char = node.text(deep=True)
            start = self._length
            self._emit(char)
            self.entities.append(Entity(type="emoji", offset=start, length=len(char)))
            return char
        if tag == "tg-emoji":
            char = node.text(deep=True)
            start = self._length
            self._emit(char)
            self.entities.append(
                Entity(
                    type="custom_emoji",
                    offset=start,
                    length=len(char),
                    custom_emoji_id=node.attributes.get("emoji-id"),
                )
            )
            return char

        if tag == "i" and "emoji" not in classes:
            return self._span(node, "italic", "*")
        if tag in _SIMPLE_TAGS:
            etype, marker = _SIMPLE_TAGS[tag]
            return self._span(node, etype, marker)
        if tag == "span" and "tg-spoiler" in classes:
            return self._span(node, "spoiler", "||")
        if tag == "pre":
            return self._span(node, "pre", "```", block=True)
        if tag == "code":
            return self._span(node, "code", "`")
        if tag == "a":
            return self._link(node)
        # Unknown/transparent wrapper (div, span, ...): recurse through it.
        return self.walk_children(node)

    def _span(self, node: LexborNode, etype: str, marker: str, *, block: bool = False) -> str:
        start = self._length
        inner_md = self.walk_children(node)
        length = self._length - start
        if length == 0:
            return ""
        self.entities.append(Entity(type=etype, offset=start, length=length))  # type: ignore[arg-type]
        if etype == "underline":
            return f"<u>{inner_md}</u>"
        if block:
            return f"\n{marker}\n{inner_md}\n{marker}\n"
        return f"{marker}{inner_md}{marker}"

    def _link(self, node: LexborNode) -> str:
        href = node.attributes.get("href")
        start = self._length
        inner_md = self.walk_children(node)
        length = self._length - start
        if length == 0:
            return ""
        visible = self.text[start:]
        etype = "link"
        if visible.startswith("@"):
            etype = "mention"
        elif visible.startswith("#"):
            etype = "hashtag"
        elif visible.startswith("$") and (href or "").find("q=%24") != -1:
            etype = "cashtag"
        self.entities.append(
            Entity(type=etype, offset=start, length=length, url=href)  # type: ignore[arg-type]
        )
        if etype in ("mention", "hashtag", "cashtag") or not href:
            return inner_md
        return f"[{inner_md}]({href})"


def inner_html(node: LexborNode) -> str:
    parts = []
    for child in node.iter(include_text=True):
        parts.append(child.html or child.text(deep=True))
    return "".join(parts)


def extract_rich_text(node: LexborNode) -> RichText:
    """Extract plain text, entities and markdown from a message text node."""
    walker = _Walker()
    markdown = walker.walk_children(node)
    return RichText(
        text=walker.text,
        html=inner_html(node),
        markdown=markdown,
        entities=walker.entities,
    )
