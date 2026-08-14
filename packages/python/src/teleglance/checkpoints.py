"""Resumable message cursors and a small JSON checkpoint store."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Protocol, cast

from pydantic import BaseModel, ValidationError

from .errors import CheckpointError
from .models import Message


class MessageCheckpoint(BaseModel):
    channel: str
    oldest_id: int | None = None
    newest_id: int | None = None
    updated_at: datetime | None = None

    def record(self, message: Message) -> MessageCheckpoint:
        """Return a checkpoint advanced after ``message`` was processed."""
        if message.channel != self.channel:
            raise CheckpointError(
                f"checkpoint for {self.channel!r} cannot record {message.channel!r}"
            )
        oldest = message.id if self.oldest_id is None else min(self.oldest_id, message.id)
        newest = message.id if self.newest_id is None else max(self.newest_id, message.id)
        return self.model_copy(
            update={
                "oldest_id": oldest,
                "newest_id": newest,
                "updated_at": datetime.now(timezone.utc),
            }
        )


class CheckpointStore(Protocol):
    async def load(self, key: str) -> MessageCheckpoint | None: ...

    async def save(self, key: str, checkpoint: MessageCheckpoint) -> None: ...


class JsonCheckpointStore:
    """Single-writer checkpoint store using atomic JSON file replacement."""

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self._lock = asyncio.Lock()

    def _read(self) -> dict[str, object]:
        if not self.path.exists():
            return {"version": 1, "checkpoints": {}}
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise CheckpointError(f"cannot read checkpoint file {self.path}: {exc}") from exc
        if not isinstance(data, dict) or not isinstance(data.get("checkpoints"), dict):
            raise CheckpointError(f"invalid checkpoint file structure: {self.path}")
        return data

    async def load(self, key: str) -> MessageCheckpoint | None:
        async with self._lock:
            data = self._read()
        checkpoints = cast(dict[str, object], data["checkpoints"])
        raw = checkpoints.get(key)
        if raw is None:
            return None
        try:
            return MessageCheckpoint.model_validate(raw)
        except ValidationError as exc:
            raise CheckpointError(f"invalid checkpoint {key!r} in {self.path}") from exc

    def _write(self, key: str, checkpoint: MessageCheckpoint) -> None:
        data = self._read()
        checkpoints = data["checkpoints"]
        assert isinstance(checkpoints, dict)
        checkpoints[key] = checkpoint.model_dump(mode="json")
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.path.with_name(f".{self.path.name}.tmp")
        try:
            temporary.write_text(
                json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8"
            )
            temporary.replace(self.path)
        except OSError as exc:
            temporary.unlink(missing_ok=True)
            raise CheckpointError(f"cannot write checkpoint file {self.path}: {exc}") from exc

    async def save(self, key: str, checkpoint: MessageCheckpoint) -> None:
        if not key:
            raise CheckpointError("checkpoint key cannot be empty")
        async with self._lock:
            self._write(key, checkpoint)
