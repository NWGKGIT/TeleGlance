import Link from 'next/link';
import { CodeBlock } from '../components/code-block';

export default function HomePage() {
  return <div className="content-body home-page">
    <section className="hero"><p className="hero-kicker">PUBLIC TELEGRAM DATA · MIT LICENSE · v0.1.1</p><h1>One calm interface for public Telegram channels.</h1><p className="hero-copy">TeleGlance reads t.me web previews with typed, async clients for Python and TypeScript. No API keys, MTProto sessions, or Telegram account required.</p><div className="hero-actions"><Link className="button button-primary" href="/python/getting-started">Start with Python</Link><Link className="button button-secondary" href="/typescript">Use TypeScript</Link></div><div className="hero-install"><span>$</span><code>pip install teleglance</code><span className="install-or">or</span><code>npm install teleglance</code></div></section>
    <div className="home-grid"><Link className="language-card python-card" href="/python/getting-started"><span className="card-label">PYTHON · 3.10–3.14</span><h2>Python client</h2><p>Async iterators, Pydantic models, checkpoints, media downloads, and an ergonomic Click CLI.</p><span className="card-arrow">Explore Python →</span></Link><Link className="language-card typescript-card" href="/typescript"><span className="card-label">NODE.JS · 18+</span><h2>TypeScript client</h2><p>ESM and CommonJS builds, typed models, live polling, JSON capture, and a Commander CLI.</p><span className="card-arrow">Explore TypeScript →</span></Link></div>
    <section className="home-section"><p className="eyebrow">A deliberately small surface</p><h2>Useful data, without account machinery.</h2><p>Both packages share the same core vocabulary: channels, messages, media, pagination, search, live updates, and safe JSON capture. They are separate release lines, so each ecosystem can evolve on its own schedule.</p></section>
    <CodeBlock language="Python + TypeScript">{`# Python
async for message in client.iter_messages("telegram", limit=10):
    print(message.id, message.text)

// TypeScript
for await (const message of client.iterMessages("telegram", { limit: 10 })) {
  console.log(message.id, message.text);
}`}</CodeBlock>
  </div>;
}
