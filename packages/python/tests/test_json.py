import json

import pytest

from teleglance import Message, capture_json, dump_json


def test_dump_json_serializes_models_and_dates():
    message = Message(id=1, channel="test", url="https://t.me/test/1")
    assert json.loads(dump_json(message))["id"] == 1


def test_capture_json_writes_json_and_ndjson(tmp_path):
    path = tmp_path / "capture.json"
    capture_json([{"id": 1}], path)
    assert json.loads(path.read_text()) == [{"id": 1}]
    with pytest.raises(FileExistsError):
        capture_json([], path)

    stream = tmp_path / "capture.ndjson"
    capture_json([{"id": 1}, {"id": 2}], stream, ndjson=True)
    assert [json.loads(line) for line in stream.read_text().splitlines()] == [{"id": 1}, {"id": 2}]
