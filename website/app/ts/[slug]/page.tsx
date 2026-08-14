import { notFound } from 'next/navigation';
import { CodeBlock } from '../../../components/code-block';
import { PageHeader } from '../../../components/page-header';
import { Section } from '../../../components/section';

const pages = {
  'getting-started': { title: 'Getting started', description: 'Install the TypeScript package and make your first request.' },
  'api-reference': { title: 'API reference', description: 'Complete client API, methods, and return types.' },
  'checkpoints': { title: 'Checkpoints', description: 'Resume history and live streams without reprocessing messages.' },
  'media-downloads': { title: 'Media downloads', description: 'Download photos, videos, stickers, and documents.' },
  'live-watching': { title: 'Live watching', description: 'Poll for new messages in real-time with automatic retries.' },
  'customization': { title: 'Customization', description: 'Configure transport, selectors, parsers, and error handling.' },
} as const;

export function generateStaticParams() { return Object.keys(pages).map((slug) => ({ slug })); }

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const page = pages[params.slug as keyof typeof pages];
  if (!page) return {};
  return { title: page.title };
}

export default function TypeScriptPage({ params }: { params: { slug: string } }) {
  const page = pages[params.slug as keyof typeof pages];
  if (!page) notFound();

  return <div className="content-body">
    <PageHeader eyebrow="TypeScript" title={page.title} description={page.description} />

    {params.slug === 'getting-started' && <>
      <Section title="Install">
        <p>TeleGlance requires Node.js 18 or newer. Install from npm:</p>
        <CodeBlock language="Bash">{`npm install teleglance

# Or with yarn/pnpm
yarn add teleglance
pnpm add teleglance`}</CodeBlock>
      </Section>

      <Section title="First request">
        <p>The client supports both ESM and CommonJS. Remember to call <code>close()</code> when done:</p>
        <CodeBlock language="TypeScript">{`import { TeleGlanceClient } from 'teleglance';

const client = new TeleGlanceClient();

try {
  // Get channel metadata
  const channel = await client.getChannel('telegram');
  console.log(channel.title, channel.counts.subscribers);

  // Iterate over recent messages
  for await (const message of client.iterMessages('telegram', { limit: 10 })) {
    console.log(\`\${message.id}: \${message.text.slice(0, 80)}\`);
  }
} finally {
  await client.close();
}`}</CodeBlock>
      </Section>

      <Section title="Pagination">
        <p>History is newest-first by default. Use <code>before</code> for older messages:</p>
        <CodeBlock language="TypeScript">{`// Get first page
const messages = await client.getMessages('telegram', { limit: 20 });

// Get next page using oldest message ID
const older = await client.getMessages('telegram', {
  limit: 20,
  before: messages[messages.length - 1].id
});

// Or iterate automatically
for await (const message of client.iterMessages('telegram', { limit: 100 })) {
  console.log(message.id, message.date);
}`}</CodeBlock>
      </Section>

      <Section title="Search">
        <p>Search within a channel using keyword queries:</p>
        <CodeBlock language="TypeScript">{`for await (const message of client.search('telegram', 'release', { limit: 20 })) {
  console.log(message.url);
}

// Search also supports before/after pagination
const results = await client.search('python', 'async', { limit: 50 });`}</CodeBlock>
      </Section>

      <Section title="CLI usage">
        <p>The CLI provides JSON output for scripting and data export:</p>
        <CodeBlock language="Bash">{`# Get channel info
teleglance channel telegram --output channel.json

# Fetch message history
teleglance messages telegram --limit 100 --output messages.json

# Search and save results
teleglance search telegram "release" --limit 50 --output search.json`}</CodeBlock>
      </Section>
    </>}

    {params.slug === 'api-reference' && <>
      <Section title="TeleGlanceClient">
        <p>The main client class for all operations.</p>
        <CodeBlock language="TypeScript">{`const client = new TeleGlanceClient({
  baseUrl: 'https://t.me',          // Base URL for requests
  rateLimit: 1000,                  // Milliseconds between requests
  retries: 3,                       // Retry attempts on failure
  timeout: 15000,                   // Request timeout in milliseconds
  proxy: undefined,                 // HTTP/HTTPS proxy URL
  headers: {},                      // Custom HTTP headers
  registry: undefined,              // Custom parser registry
  selectors: undefined,             // Custom CSS selectors
  strictParsing: false,             // Throw on parse warnings
});`}</CodeBlock>
      </Section>

      <Section title="getChannel">
        <p>Fetch channel metadata including title, description, and subscriber count.</p>
        <CodeBlock language="TypeScript">{`const channel = await client.getChannel('telegram');

console.log(channel.name);              // Channel username
console.log(channel.title);             // Display title
console.log(channel.description);       // Channel description (if available)
console.log(channel.counts.subscribers); // Subscriber count
console.log(channel.photoUrl);          // Profile photo URL (if available)`}</CodeBlock>
      </Section>

      <Section title="getMessage">
        <p>Fetch a single message by ID.</p>
        <CodeBlock language="TypeScript">{`const message = await client.getMessage('telegram', 12345);

console.log(message.id);                // Message ID
console.log(message.text);              // Text content
console.log(message.date);              // Posted timestamp
console.log(message.views);             // View count
console.log(message.media);             // Media attachments (if any)`}</CodeBlock>
      </Section>

      <Section title="getMessages">
        <p>Fetch a page of messages. Returns newest-first by default.</p>
        <CodeBlock language="TypeScript">{`// Get latest messages
const messages = await client.getMessages('telegram', { limit: 20 });

// Paginate backwards
const older = await client.getMessages('telegram', {
  limit: 20,
  before: messages[messages.length - 1].id
});

// Get newer messages (forward pagination)
const newer = await client.getMessages('telegram', {
  limit: 20,
  after: oldestId
});`}</CodeBlock>
      </Section>

      <Section title="iterMessages">
        <p>Async iterator for history pagination. Automatically fetches pages.</p>
        <CodeBlock language="TypeScript">{`for await (const message of client.iterMessages('telegram', { limit: 100 })) {
  console.log(message.id, message.text);
}

// With before cursor
for await (const message of client.iterMessages('telegram', {
  limit: 50,
  before: messageId
})) {
  process(message);
}`}</CodeBlock>
      </Section>

      <Section title="iterNewMessages">
        <p>Iterate forward in time from a given message ID (oldest-first).</p>
        <CodeBlock language="TypeScript">{`// Get all messages after ID 12345
for await (const message of client.iterNewMessages('telegram', { after: 12345 })) {
  console.log(\`New: \${message.id}\`);
}`}</CodeBlock>
      </Section>

      <Section title="search">
        <p>Search for messages matching a query string.</p>
        <CodeBlock language="TypeScript">{`// Simple search
const results = await client.search('telegram', 'python', { limit: 20 });

// Async iteration
for await (const message of client.search('telegram', 'release notes', { limit: 100 })) {
  console.log(message.url);
}`}</CodeBlock>
      </Section>

      <Section title="watch">
        <p>Poll for new messages in real-time. See Live watching page for details.</p>
        <CodeBlock language="TypeScript">{`import { watch } from 'teleglance';

for await (const message of watch(client, 'telegram', 30000)) {
  console.log(\`New post: \${message.id}\`);
}`}</CodeBlock>
      </Section>

      <Section title="Type definitions">
        <p>All models are fully typed with exported TypeScript interfaces.</p>
        <CodeBlock language="TypeScript">{`import type { Channel, Message, Media } from 'teleglance';

// All properties are typed
const channel: Channel = await client.getChannel('telegram');
const message: Message = await client.getMessage('telegram', 123);

// Media is an array of typed objects
if (message.media) {
  for (const item of message.media) {
    console.log(item.type, item.url);
  }
}`}</CodeBlock>
      </Section>
    </>}

    {params.slug === 'checkpoints' && <>
      <Section title="What are checkpoints?">
        <p>Checkpoints track your position in a message stream so you can resume without reprocessing. They store the oldest and newest message IDs you've seen, along with the channel name to prevent accidental reuse across channels.</p>
      </Section>

      <Section title="JsonCheckpointStore">
        <p>Built-in file-based checkpoint storage using versioned JSON.</p>
        <CodeBlock language="TypeScript">{`import { JsonCheckpointStore, CheckpointState } from 'teleglance';

const store = new JsonCheckpointStore('state.json');

// Load checkpoint (returns null if not found)
let state = await store.load('stream:telegram');

// Start from checkpoint or beginning
const afterId = state?.newestId;

for await (const message of client.iterNewMessages('telegram', { after: afterId })) {
  // Process message
  console.log(message.id);

  // Update checkpoint
  if (!state) {
    state = new CheckpointState('telegram', message.id, message.id);
  } else {
    state = state.record(message);
  }

  // Save periodically
  await store.save('stream:telegram', state);
}`}</CodeBlock>
      </Section>

      <Section title="Resume history iteration">
        <p>Use checkpoints to resume backward pagination through history.</p>
        <CodeBlock language="TypeScript">{`const store = new JsonCheckpointStore('history.json');
let state = await store.load('history:telegram');

// Resume from where we left off
const beforeId = state?.oldestId;

for await (const message of client.iterMessages('telegram', {
  limit: 1000,
  before: beforeId
})) {
  process(message);

  // Update checkpoint with oldest seen ID
  if (!state) {
    state = new CheckpointState('telegram', message.id, message.id);
  } else {
    state = state.record(message);
  }

  // Save every 50 messages
  if (message.id % 50 === 0) {
    await store.save('history:telegram', state);
  }
}`}</CodeBlock>
      </Section>

      <Section title="Custom checkpoint backends">
        <p>Implement the <code>CheckpointStore</code> interface for databases or other storage:</p>
        <CodeBlock language="TypeScript">{`import type { CheckpointStore, CheckpointState } from 'teleglance';

class RedisCheckpointStore implements CheckpointStore {
  constructor(private redis: RedisClient) {}

  async load(key: string): Promise<CheckpointState | null> {
    const data = await this.redis.get(\`checkpoint:\${key}\`);
    if (data) {
      return CheckpointState.fromJson(JSON.parse(data));
    }
    return null;
  }

  async save(key: string, state: CheckpointState): Promise<void> {
    await this.redis.set(\`checkpoint:\${key}\`, JSON.stringify(state.toJson()));
  }
}

const store = new RedisCheckpointStore(redisClient);
const state = await store.load('stream:telegram');`}</CodeBlock>
      </Section>
    </>}

    {params.slug === 'media-downloads' && <>
      <Section title="downloadMedia">
        <p>Download media to disk with automatic filename handling.</p>
        <CodeBlock language="TypeScript">{`import { downloadMedia } from 'teleglance';

for await (const message of client.iterMessages('telegram', { limit: 20 })) {
  if (message.media) {
    for (const item of message.media) {
      // Download to directory (auto-generates filename)
      const path = await downloadMedia(item, './downloads');
      console.log(\`Saved to \${path}\`);

      // With overwrite control
      const path2 = await downloadMedia(item, './downloads', {
        overwrite: false  // Skip if file exists
      });
    }
  }
}`}</CodeBlock>
      </Section>

      <Section title="downloadBytes">
        <p>Download media to memory for processing without saving to disk.</p>
        <CodeBlock language="TypeScript">{`import { downloadBytes } from 'teleglance';

for await (const message of client.iterMessages('photos', { limit: 10 })) {
  if (message.media) {
    for (const photo of message.media) {
      // Download to buffer
      const data = await downloadBytes(photo);

      // With size limit
      const data2 = await downloadBytes(photo, {
        maxBytes: 10_000_000  // 10 MB limit
      });

      // Process in memory
      const sharp = require('sharp');
      await sharp(data)
        .resize(200, 200)
        .toFile('thumbnail.jpg');
    }
  }
}`}</CodeBlock>
      </Section>

      <Section title="Media types">
        <p>Messages can contain photos, videos, stickers, documents, and more.</p>
        <CodeBlock language="TypeScript">{`if (message.media) {
  for (const item of message.media) {
    console.log(\`Type: \${item.type}\`);        // photo, video, sticker, document, etc.
    console.log(\`URL: \${item.url}\`);          // Direct download URL
    console.log(\`Size: \${item.sizeBytes}\`);   // File size (if available)

    // Type-specific fields
    if (item.type === 'photo') {
      console.log(\`Dimensions: \${item.width}x\${item.height}\`);
    } else if (item.type === 'video') {
      console.log(\`Duration: \${item.durationSeconds}s\`);
    }
  }
}`}</CodeBlock>
      </Section>

      <Section title="Error handling">
        <p>Handle download failures gracefully.</p>
        <CodeBlock language="TypeScript">{`import { RequestFailed } from 'teleglance';

for await (const message of client.iterMessages('channel', { limit: 50 })) {
  if (message.media) {
    for (const item of message.media) {
      try {
        const path = await downloadMedia(item, './downloads');
        console.log(\`Downloaded: \${path}\`);
      } catch (err) {
        if (err instanceof RequestFailed) {
          console.error(\`Failed to download \${item.url}: \${err.message}\`);
        } else {
          console.error(\`Disk error: \${err}\`);
        }
      }
    }
  }
}`}</CodeBlock>
      </Section>
    </>}

    {params.slug === 'live-watching' && <>
      <Section title="watch">
        <p>Poll a channel for new messages in real-time. The watcher handles transient failures automatically and only propagates fatal errors.</p>
        <CodeBlock language="TypeScript">{`import { watch } from 'teleglance';

for await (const message of watch(client, 'telegram', 30000)) {
  console.log(\`New message: \${message.id}\`);
  console.log(message.text);
}

// The loop runs forever until interrupted or the channel becomes inaccessible`}</CodeBlock>
      </Section>

      <Section title="Resume from checkpoint">
        <p>Combine watch with checkpoints to avoid missing messages across restarts.</p>
        <CodeBlock language="TypeScript">{`import { watch, JsonCheckpointStore, CheckpointState } from 'teleglance';

const store = new JsonCheckpointStore('watch.json');
let state = await store.load('watch:telegram');

// Start watching from last seen message
const sinceId = state?.newestId;

for await (const message of watch(client, 'telegram', 30000, sinceId)) {
  console.log(\`New: \${message.id}\`);

  // Update checkpoint
  if (!state) {
    state = new CheckpointState('telegram', message.id, message.id);
  } else {
    state = state.record(message);
  }

  await store.save('watch:telegram', state);
}`}</CodeBlock>
      </Section>

      <Section title="Error handling">
        <p>Transient errors (rate limits, network issues, parse failures) are logged and retried automatically. Fatal errors (channel deleted, made private) propagate immediately.</p>
        <CodeBlock language="TypeScript">{`import { watch } from 'teleglance';
import { ChannelNotFound, ChannelPrivate } from 'teleglance';

try {
  for await (const message of watch(client, 'telegram', 30000)) {
    process(message);
  }
} catch (err) {
  if (err instanceof ChannelNotFound) {
    console.error('Channel was deleted');
  } else if (err instanceof ChannelPrivate) {
    console.error('Channel was made private');
  } else {
    throw err;
  }
}`}</CodeBlock>
      </Section>

      <Section title="Interval tuning">
        <p>Choose an interval based on channel activity and rate-limit tolerance.</p>
        <CodeBlock language="TypeScript">{`// High-frequency channel (post every few minutes)
for await (const msg of watch(client, 'breaking_news', 10000)) {
  alert(msg);
}

// Low-frequency channel (few posts per day)
for await (const msg of watch(client, 'announcements', 300000)) {
  archive(msg);
}

// Minimum safe interval is ~5000ms (5 seconds) to avoid rate limiting`}</CodeBlock>
      </Section>

      <Section title="CLI watch">
        <p>The CLI can watch channels and append to NDJSON files.</p>
        <CodeBlock language="Bash">{`# Watch and print to stdout
teleglance watch telegram --interval 30000

# Append to NDJSON file
teleglance watch telegram --interval 30000 --output watch.ndjson

# Resume from existing NDJSON (reads last line)
teleglance watch telegram --interval 30000 --output watch.ndjson --resume`}</CodeBlock>
      </Section>
    </>}

    {params.slug === 'customization' && <>
      <Section title="Proxy configuration">
        <p>Route requests through HTTP/HTTPS proxies.</p>
        <CodeBlock language="TypeScript">{`const client = new TeleGlanceClient({
  proxy: 'http://proxy.example.com:8080'
});

// With authentication
const client2 = new TeleGlanceClient({
  proxy: 'http://user:pass@proxy.example.com:8080'
});`}</CodeBlock>
      </Section>

      <Section title="Rate limiting">
        <p>Control request rate to avoid triggering Telegram's rate limits.</p>
        <CodeBlock language="TypeScript">{`// Default: 1 request per second (1000ms)
const client = new TeleGlanceClient({ rateLimit: 1000 });

// More conservative
const client2 = new TeleGlanceClient({ rateLimit: 2000 });

// Aggressive (risk rate limiting)
const client3 = new TeleGlanceClient({ rateLimit: 500 });`}</CodeBlock>
      </Section>

      <Section title="Custom headers">
        <p>Override User-Agent or add custom headers.</p>
        <CodeBlock language="TypeScript">{`const client = new TeleGlanceClient({
  headers: {
    'User-Agent': 'MyBot/1.0',
    'Accept-Language': 'en-US,en;q=0.9',
  }
});`}</CodeBlock>
      </Section>

      <Section title="Strict parsing">
        <p>Enable strict mode to throw exceptions on parsing warnings.</p>
        <CodeBlock language="TypeScript">{`// Default: log warnings but continue
const client = new TeleGlanceClient({ strictParsing: false });

// Strict: throw ParseError on any parsing issue
const client2 = new TeleGlanceClient({ strictParsing: true });`}</CodeBlock>
      </Section>

      <Section title="Custom selectors">
        <p>Override CSS selectors if Telegram changes their markup.</p>
        <CodeBlock language="TypeScript">{`import { DEFAULT_SELECTORS, type Selectors } from 'teleglance';

const customSelectors: Selectors = {
  ...DEFAULT_SELECTORS,
  channelTitle: '.tgme_channel_info_header_title',
  messageBubble: '.tgme_widget_message',
};

const client = new TeleGlanceClient({ selectors: customSelectors });`}</CodeBlock>
      </Section>

      <Section title="Request hooks">
        <p>Inspect or modify requests before they're sent.</p>
        <CodeBlock language="TypeScript">{`import type { RequestHook } from 'teleglance';

const logRequest: RequestHook = (url, params) => {
  console.log(\`GET \${url}\`, params);
};

const client = new TeleGlanceClient({
  requestHooks: [logRequest]
});`}</CodeBlock>
      </Section>

      <Section title="Response hooks">
        <p>Inspect responses after they arrive.</p>
        <CodeBlock language="TypeScript">{`import type { ResponseHook } from 'teleglance';

const logResponse: ResponseHook = (response) => {
  console.log(\`Response: \${response.statusCode}\`);
};

const client = new TeleGlanceClient({
  responseHooks: [logResponse]
});`}</CodeBlock>
      </Section>
    </>}
  </div>;
}
