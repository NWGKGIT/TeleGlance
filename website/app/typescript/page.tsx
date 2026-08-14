import { CodeBlock } from '../../components/code-block';
import { PageHeader } from '../../components/page-header';
import { Section } from '../../components/section';

export const metadata = { title: 'TypeScript' };

export default function TypeScriptPage() {
  return <div className="content-body"><PageHeader eyebrow="TypeScript" title="A typed client for Node.js." description="Node.js 18+, ESM and CommonJS builds, and a small API shaped around async iteration." />
    <Section title="Install"><p>Install the public npm package in any Node.js 18+ project.</p><CodeBlock language="Bash">npm install teleglance</CodeBlock></Section>
    <Section title="First request"><CodeBlock language="TypeScript">{`import { TeleGlanceClient } from 'teleglance';

const client = new TeleGlanceClient();
try {
  const channel = await client.getChannel('telegram');
  console.log(channel.title, channel.counts.subscribers);
  for await (const message of client.iterMessages('telegram', { limit: 10 })) {
    console.log(message.id, message.text.slice(0, 80));
  }
} finally {
  await client.close();
}`}</CodeBlock></Section>
    <Section title="History, search, and live updates"><p>History is newest first. Use <code>before</code> for older pages, <code>after</code> for forward updates, and <code>watch</code> for polling.</p><CodeBlock language="TypeScript">{`for await (const message of client.search('telegram', 'release', { limit: 20 })) {
  console.log(message.url);
}
for await (const message of client.watch('telegram', { interval: 30_000 })) {
  console.log('new post:', message.id);
}`}</CodeBlock></Section>
    <Section title="JSON capture"><p>Capture helpers provide formatted JSON, NDJSON streams, and safe file replacement behavior.</p><CodeBlock language="TypeScript">{`import { captureJson, appendJson } from 'teleglance';
await captureJson(messages, 'messages.json');
await captureJson([], 'watch.ndjson', { ndjson: true });
await appendJson(message, 'watch.ndjson');`}</CodeBlock></Section>
    <Section title="CLI"><p>The CLI prints JSON by default. Add <code>--ndjson</code> for streams and <code>--output</code> for file capture.</p><CodeBlock language="Bash">{`teleglance channel telegram --output channel.json
teleglance messages telegram --limit 100 --output history.json
teleglance watch telegram --output watch.ndjson --overwrite`}</CodeBlock></Section>
    <Section title="Public surface"><div className="api-grid"><div><strong>Client</strong><span>getChannel · getMessage</span><span>iterMessages · iterNewMessages</span><span>search · watch</span></div><div><strong>Utilities</strong><span>captureJson · appendJson</span><span>downloadMedia · downloadBytes</span><span>JsonCheckpointStore</span></div></div></Section>
  </div>;
}
