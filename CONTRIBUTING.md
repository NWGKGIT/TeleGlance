# Contributing

TeleGlance parses public `t.me` HTML, so parser changes must be demonstrated by
an authored or recorded fixture and remain offline-testable.

```bash
uv sync --all-extras --group dev
uv run ruff check .
uv run ruff format --check .
uv run mypy
uv run pytest --cov
```

To investigate live markup drift without committing machine-specific pages:

```bash
uv run scripts/record_fixtures.py telegram --embed-latest
uv run scripts/record_fixtures.py --validate tests/fixtures/live/*.html
```

Keep requests polite, never add authenticated or private-channel fixtures, and
remove personal data before committing recorded HTML.
