import json

import httpx
import respx
from click.testing import CliRunner
from conftest import make_feed, msg_html

from teleglance import Message, TeleGlanceClient
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


def test_messages_default_is_json_array(feed_html):
    with respx.mock:
        respx.get("https://t.me/s/testchan").mock(return_value=httpx.Response(200, text=feed_html))
        result = CliRunner().invoke(cli, ["messages", "testchan", "--limit", "2"])
    assert result.exit_code == 0, result.output
    data = json.loads(result.output)
    assert [message["id"] for message in data] == [110, 108]


def test_channel_not_found_is_clean_error(not_found_html):
    with respx.mock:
        respx.get("https://t.me/s/nope").mock(return_value=httpx.Response(200, text=not_found_html))
        result = CliRunner().invoke(cli, ["channel", "nope"])
    assert result.exit_code != 0
    assert "Channel not found" in result.output


def test_search_default_and_ndjson(feed_html):
    with respx.mock:
        respx.get("https://t.me/s/testchan").mock(return_value=httpx.Response(200, text=feed_html))
        array_result = CliRunner().invoke(cli, ["search", "testchan", "httpx", "--limit", "1"])
        ndjson_result = CliRunner().invoke(
            cli, ["search", "testchan", "httpx", "--limit", "1", "--ndjson"]
        )
    assert len(json.loads(array_result.output)) == 1
    assert json.loads(ndjson_result.output)["id"] == 110


def test_messages_rejects_conflicting_or_nonstreaming_checkpoint(tmp_path):
    runner = CliRunner()
    conflict = runner.invoke(cli, ["messages", "testchan", "--before", "10", "--after", "5"])
    nonstreaming = runner.invoke(
        cli, ["messages", "testchan", "--checkpoint", str(tmp_path / "state.json")]
    )
    assert conflict.exit_code == 2
    assert "mutually exclusive" in conflict.output
    assert nonstreaming.exit_code == 2
    assert "requires --ndjson" in nonstreaming.output


def test_forward_messages_updates_and_resumes_checkpoint(tmp_path):
    checkpoint = tmp_path / "state.json"

    def feed(request):
        after = request.url.params["after"]
        if after == "100":
            return httpx.Response(200, text=make_feed(msg_html(101), msg_html(102)))
        return httpx.Response(200, text=make_feed())

    with respx.mock:
        route = respx.get("https://t.me/s/testchan").mock(side_effect=feed)
        first = CliRunner().invoke(
            cli,
            [
                "messages",
                "testchan",
                "--after",
                "100",
                "--limit",
                "2",
                "--ndjson",
                "--checkpoint",
                str(checkpoint),
            ],
        )
        second = CliRunner().invoke(
            cli,
            [
                "messages",
                "testchan",
                "--after",
                "100",
                "--ndjson",
                "--checkpoint",
                str(checkpoint),
            ],
        )
    assert [json.loads(line)["id"] for line in first.output.splitlines()] == [101, 102]
    assert second.output == ""
    assert route.calls.last.request.url.params["after"] == "102"
    saved = json.loads(checkpoint.read_text())
    assert saved["checkpoints"]["messages:forward:testchan:"]["newest_id"] == 102


def test_watch_writes_checkpoint(monkeypatch, tmp_path):
    async def fake_watch(self, channel, *, interval=30.0, since_id=None):
        assert interval == 0
        assert since_id == 50
        yield Message(id=51, channel=channel, url=f"https://t.me/{channel}/51")

    monkeypatch.setattr(TeleGlanceClient, "watch", fake_watch)
    checkpoint = tmp_path / "watch.json"
    result = CliRunner().invoke(
        cli,
        [
            "watch",
            "testchan",
            "--interval",
            "0",
            "--since-id",
            "50",
            "--checkpoint",
            str(checkpoint),
        ],
    )
    assert result.exit_code == 0, result.output
    assert json.loads(result.output)["id"] == 51
    saved = json.loads(checkpoint.read_text())
    assert saved["checkpoints"]["watch:testchan"]["newest_id"] == 51


def test_download_command_reports_message_without_media(embed_html):
    with respx.mock:
        respx.get("https://t.me/testchan/42").mock(
            return_value=httpx.Response(200, text=embed_html)
        )
        result = CliRunner().invoke(cli, ["download", "testchan", "42"])
    assert result.exit_code == 0
    assert "no media" in result.output
