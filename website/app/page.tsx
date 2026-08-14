import Link from 'next/link';
import { CodeBlock } from '../components/code-block';

export default function HomePage() {
  return <div className="content-body home-page">
    <section className="hero">
      <p className="hero-kicker">PUBLIC TELEGRAM DATA · MIT LICENSE · PYTHON + TYPESCRIPT</p>
      <h1>Read public Telegram channels without an account.</h1>
      <p className="hero-copy">
        TeleGlance scrapes t.me web previews with fully typed async clients for Python and TypeScript.
        No API keys, no MTProto sessions, no Telegram account required. Just install and start reading.
      </p>
      <div className="hero-actions">
        <Link className="button button-primary" href="/py/getting-started">Python docs</Link>
        <Link className="button button-secondary" href="/ts/getting-started">TypeScript docs</Link>
      </div>
      <div className="hero-install">
        <span>$</span>
        <code>pip install teleglance</code>
        <span className="install-or">or</span>
        <span>$</span>
        <code>npm install teleglance</code>
      </div>
    </section>

    <div className="home-grid">
      <Link className="language-card python-card" href="/py/getting-started">
        <span className="card-label">PYTHON · 3.10–3.14</span>
        <h2>Python client</h2>
        <p>
          Async iterators, Pydantic models, checkpoints for resumable streams, media downloads,
          and an ergonomic Click-based CLI for scripting and automation.
        </p>
        <span className="card-arrow">Explore Python →</span>
      </Link>

      <Link className="language-card typescript-card" href="/ts/getting-started">
        <span className="card-label">NODE.JS · 18+</span>
        <h2>TypeScript client</h2>
        <p>
          Full TypeScript types, ESM and CommonJS builds, async generators, checkpoints,
          media downloads, and a Commander-based CLI with JSON output.
        </p>
        <span className="card-arrow">Explore TypeScript →</span>
      </Link>
    </div>

    <section className="home-section">
      <p className="eyebrow">Simple by design</p>
      <h2>Core features, zero complexity.</h2>
      <p>
        Both packages share the same vocabulary: channels, messages, media, pagination, search,
        live updates, and checkpointed streams. Each language evolves independently with its
        own release schedule and idiomatic patterns.
      </p>
    </section>

    <CodeBlock language="Python + TypeScript">{`# Python
async for message in client.iter_messages("telegram", limit=10):
    print(message.id, message.text)

// TypeScript
for await (const message of client.iterMessages("telegram", { limit: 10 })) {
  console.log(message.id, message.text);
}`}</CodeBlock>

    <section className="home-section">
      <p className="eyebrow">What you can do</p>
      <h2>Archive, monitor, search, and download.</h2>
      <p>
        Fetch channel metadata and message history. Search by keyword. Watch for new posts with
        automatic polling and retry logic. Download photos, videos, and documents. Resume streams
        from checkpoints without reprocessing. Export everything as JSON or NDJSON.
      </p>
    </section>

    <div className="home-grid">
      <div className="feature-card">
        <h3>History & pagination</h3>
        <p>Iterate through thousands of messages with automatic page fetching. Navigate forward or backward in time.</p>
      </div>
      <div className="feature-card">
        <h3>Live watching</h3>
        <p>Poll for new messages with configurable intervals. Automatic retry on transient failures.</p>
      </div>
      <div className="feature-card">
        <h3>Search</h3>
        <p>Query messages by keyword with full pagination support. Same async iterator API as history.</p>
      </div>
      <div className="feature-card">
        <h3>Media downloads</h3>
        <p>Save photos, videos, stickers, and documents to disk or load into memory for processing.</p>
      </div>
      <div className="feature-card">
        <h3>Checkpoints</h3>
        <p>Resume streams from where you left off. Track oldest and newest message IDs with file or custom storage.</p>
      </div>
      <div className="feature-card">
        <h3>CLI tools</h3>
        <p>Both packages include command-line interfaces for quick data export and automation scripting.</p>
      </div>
    </div>
  </div>;
}
