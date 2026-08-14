# TeleGlance for TypeScript

Async Node.js client for public Telegram channels through `t.me` web previews. It needs no API key, MTProto credentials, or Telegram account.

## Install

```sh
npm install teleglance
```

Requires Node.js 18 or newer.

## Use

```ts
import { TeleGlanceClient } from 'teleglance';

const client = new TeleGlanceClient();
try {
  const channel = await client.getChannel('telegram');
  console.log(channel.title);

  for await (const message of client.iterMessages('telegram', { limit: 10 })) {
    console.log(message.id, message.text);
  }
} finally {
  await client.close();
}
```

The package also exposes typed models, parsing errors, checkpoints, media downloads, custom parser registries, and a `teleglance` CLI. Run `teleglance --help` for command usage.

## Development

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Licensed under MIT. See [LICENSE](../../LICENSE).
