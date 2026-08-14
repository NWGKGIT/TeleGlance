# Changelog

All notable changes to TeleGlance are documented here.

## 0.1.1 - 2026-08-14

### Added

- Public `dump_json` and `capture_json` helpers for normalized JSON and NDJSON data.
- CLI `--output` and safe `--overwrite` options for channel, message, search, and watch captures.

## 0.1.0 - 2026-08-13

### Added

- Python 3.10 through 3.14 support and automated release checks.
- Forward message pagination and burst-safe live polling.
- Explicit, atomically stored JSON checkpoints for resumable consumers.
- Typed request, validation, checkpoint, and markup-drift failures.
- Atomic, size-limited media downloads with explicit overwrite control.
- Edited, reaction, comment, and location-coordinate metadata.
- Strict parser validation and scheduled live markup drift checks.

### Changed

- CLI message and search commands now emit a valid JSON array unless `--ndjson` is used.
- Exhausted 5xx and network errors no longer appear as missing channels or messages.
- The minimum supported Python version is 3.10 instead of 3.13.
