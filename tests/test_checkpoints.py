import json

import pytest

from teleglance import CheckpointError, JsonCheckpointStore, Message, MessageCheckpoint


async def test_json_checkpoint_roundtrip_and_independent_keys(tmp_path):
    path = tmp_path / "state.json"
    store = JsonCheckpointStore(path)
    first = MessageCheckpoint(channel="one").record(
        Message(id=10, channel="one", url="https://t.me/one/10")
    )
    second = MessageCheckpoint(channel="two").record(
        Message(id=20, channel="two", url="https://t.me/two/20")
    )

    await store.save("history:one", first)
    await store.save("watch:two", second)

    assert (await store.load("history:one")) == first
    assert (await store.load("watch:two")) == second
    assert await store.load("missing") is None
    assert json.loads(path.read_text())["version"] == 1


def test_checkpoint_record_tracks_both_directions():
    state = MessageCheckpoint(channel="testchan")
    for msg_id in (10, 8, 12):
        state = state.record(
            Message(
                id=msg_id,
                channel="testchan",
                url=f"https://t.me/testchan/{msg_id}",
            )
        )
    assert state.oldest_id == 8
    assert state.newest_id == 12
    assert state.updated_at is not None


async def test_corrupt_checkpoint_is_typed_error(tmp_path):
    path = tmp_path / "state.json"
    path.write_text("not json")
    with pytest.raises(CheckpointError):
        await JsonCheckpointStore(path).load("x")


def test_checkpoint_rejects_other_channel():
    state = MessageCheckpoint(channel="one")
    with pytest.raises(CheckpointError):
        state.record(Message(id=1, channel="two", url="https://t.me/two/1"))
