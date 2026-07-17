import json

import httpx
import respx
from click.testing import CliRunner

from teleglance.cli import cli


def test_channel_command(feed_html):
    with respx.mock:
        respx.get("https://t.me/s/testchan").mock(return_value=httpx.Response(200, text=feed_html))
        result = CliRunner().invoke(cli, ["channel", "testchan"])
    assert result.exit_code == 0, result.output
    data = json.loads(result.output)
    assert data["username"] == "testchan"
    assert data["counts"]["subscribers"] == 36600


def test_messages_ndjson(feed_html):
    with respx.mock:
        respx.get("https://t.me/s/testchan").mock(return_value=httpx.Response(200, text=feed_html))
        result = CliRunner().invoke(cli, ["messages", "testchan", "--limit", "3", "--ndjson"])
    assert result.exit_code == 0, result.output
    lines = [json.loads(line) for line in result.output.strip().splitlines()]
    assert [m["id"] for m in lines] == [110, 108, 107]


def test_channel_not_found_is_clean_error(not_found_html):
    with respx.mock:
        respx.get("https://t.me/s/nope").mock(return_value=httpx.Response(200, text=not_found_html))
        result = CliRunner().invoke(cli, ["channel", "nope"])
    assert result.exit_code != 0
    assert "Channel not found" in result.output
