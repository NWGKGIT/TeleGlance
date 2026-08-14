import { notFound } from 'next/navigation';
import { CodeBlock } from '../../../components/code-block';
import { PageHeader } from '../../../components/page-header';
import { Section } from '../../../components/section';

const pages = {
  'getting-started': { title: 'Getting started', description: 'Install the Python package and make your first request.', content: 'start' },
  'api-reference': { title: 'API reference', description: 'The typed client surface and the objects it returns.', content: 'api' },
  checkpoints: { title: 'Checkpoints & resumability', description: 'Resume history and live streams without reprocessing messages.', content: 'checkpoints' },
  'media-downloads': { title: 'Media downloads', description: 'Save photos, videos, stickers, and other downloadable media.', content: 'media' },
  'advanced-customization': { title: 'Advanced customization', description: 'Tune transport, selectors, registries, and parser behavior.', content: 'custom' },
} as const;

export function generateStaticParams() { return Object.keys(pages).map((slug) => ({ slug })); }

export default function PythonPage({ params }: { params: { slug: string } }) {
  const page = pages[params.slug as keyof typeof pages];
  if (!page) notFound();
  return <div className="content-body"><PageHeader eyebrow="Python" title={page.title} description={page.description} />
    {page.content === 'start' && <><Section title="Install"><p>TeleGlance supports Python 3.10 through 3.14.</p><CodeBlock language="Bash">{`pip install teleglance
# optional CLI and SOCKS support
pip install "teleglance[cli,socks]"`}</CodeBlock></Section><Section title="First request"><CodeBlock language="Python">{`import asyncio
from teleglance import TeleGlanceClient

async def main():
    async with TeleGlanceClient() as client:
        channel = await client.get_channel("telegram")
        async for message in client.iter_messages("telegram", limit=10):
            print(message.id, message.text)

asyncio.run(main())`}</CodeBlock></Section></>}
    {page.content === 'api' && <><Section title="TeleGlanceClient"><p>The client exposes <code>get_channel</code>, <code>get_message</code>, <code>iter_messages</code>, <code>iter_new_messages</code>, <code>search</code>, <code>watch</code>, and media download methods.</p></Section><Section title="Serialization"><p>Models are Pydantic objects and support native <code>model_dump</code> methods. The package also exports <code>dump_json</code> and <code>capture_json</code> for stable JSON and NDJSON output.</p></Section></>}
    {page.content === 'checkpoints' && <Section title="Resume a stream"><p><code>JsonCheckpointStore</code> records oldest and newest message IDs per named stream. It validates channel ownership and writes a versioned JSON document.</p><CodeBlock language="Python">{`store = JsonCheckpointStore("state.json")
state = await store.load("messages:forward:telegram:")
async for message in client.iter_new_messages("telegram", after=state.newest_id):
    state = state.record(message)
    await store.save("messages:forward:telegram:", state)`}</CodeBlock></Section>}
    {page.content === 'media' && <Section title="Download media"><p>Use <code>download_media</code> for files on disk or <code>download_bytes</code> for in-memory processing. Both support size limits and explicit overwrite control.</p><CodeBlock language="Python">{`path = await client.download_media(photo, "./downloads", overwrite=False)
data = await client.download_bytes(photo, max_bytes=10_000_000)`}</CodeBlock></Section>}
    {page.content === 'custom' && <Section title="Keep markup changes isolated"><p>Selectors, parser registries, and transport hooks are independent extension points. Override only the part your deployment needs while keeping the client API stable.</p><CodeBlock language="Python">{`client = TeleGlanceClient(
    proxy="socks5://127.0.0.1:9050",
    rate_limit=2.0,
    strict_parsing=True,
)`}</CodeBlock></Section>}
  </div>;
}
