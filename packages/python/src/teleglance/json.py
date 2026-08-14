"""JSON serialization and file capture helpers."""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import Any

from pydantic import BaseModel, TypeAdapter


def dump_json(value: Any, *, ndjson: bool = False) -> str:
    """Serialize models and JSON-compatible values for CLI or file output.

    ``ndjson`` expects an iterable and emits one compact JSON object per line.
    """
    if ndjson:
        if isinstance(value, (BaseModel, Mapping)):
            value = [value]
        elif isinstance(value, (str, bytes)) or not isinstance(value, Iterable):
            raise TypeError("ndjson output requires an iterable of values")
        return "".join(TypeAdapter(Any).dump_json(item).decode() + "\n" for item in value)
    return TypeAdapter(Any).dump_json(value, indent=2).decode() + "\n"


def capture_json(
    value: Any,
    path: str | Path,
    *,
    ndjson: bool = False,
    overwrite: bool = False,
) -> Path:
    """Serialize *value* to *path*, refusing to replace a file by default."""
    target = Path(path)
    if target.exists() and not overwrite:
        raise FileExistsError(f"Destination already exists: {target}")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(dump_json(value, ndjson=ndjson), encoding="utf-8")
    return target
