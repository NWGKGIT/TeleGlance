# /// script
# requires-python = ">=3.13"
# dependencies = ["httpx>=0.27"]
# ///
"""Record real t.me pages as HTML fixtures.

The test suite runs offline against authored fixtures in tests/fixtures/.
This script captures the real thing so you can diff Telegram's current markup
against what the parsers expect — run it from a machine that can reach t.me:

    uv run scripts/record_fixtures.py telegram
    uv run scripts/record_fixtures.py telegram --before 100 --out tests/fixtures/live

Then point the parsers at the recorded pages, e.g.:

    uv run python -c "
    from pathlib import Path
    from teleglance.parsing import parse_feed, default_registry
    html = Path('tests/fixtures/live/telegram_feed.html').read_text()
    for m in parse_feed(html, default_registry()):
        print(m.id, m.media, m.text[:60])
    "

If messages come back with empty fields or missing media, the live markup has
drifted from the fixtures — update the selectors (and fixtures) to match.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import httpx

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    )
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("channel", help="public channel username, e.g. telegram")
    parser.add_argument("--before", type=int, default=None, help="record an older feed page")
    parser.add_argument("--msg-id", type=int, default=None, help="also record this message's embed page")
    parser.add_argument("--out", type=Path, default=Path("tests/fixtures/live"))
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=20) as client:
        pages = {
            f"{args.channel}_feed.html": (f"https://t.me/s/{args.channel}", {}),
            f"{args.channel}_card.html": (f"https://t.me/{args.channel}", {}),
        }
        if args.before is not None:
            pages[f"{args.channel}_feed_before_{args.before}.html"] = (
                f"https://t.me/s/{args.channel}",
                {"before": args.before},
            )
        if args.msg_id is not None:
            pages[f"{args.channel}_embed_{args.msg_id}.html"] = (
                f"https://t.me/{args.channel}/{args.msg_id}",
                {"embed": "1", "mode": "tme"},
            )
        for filename, (url, params) in pages.items():
            response = client.get(url, params=params)
            target = args.out / filename
            target.write_text(response.text)
            print(f"{response.status_code} {response.url} -> {target}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
