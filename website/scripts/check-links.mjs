import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const out = resolve('out');
if (!existsSync(out)) throw new Error('Run `npm run build` before checking links.');
const pages = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith('.html')) pages.push(path);
  }
}
walk(out);
const missing = [];
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const href of html.matchAll(/href="([^"]+)"/g)) {
    const target = href[1];
    if (!target.startsWith('/') || target.startsWith('//') || target.includes('://') || target.startsWith('#')) continue;
    const clean = target.split('#')[0].split('?')[0].replace(/^\/TeleGlance\/?/, '/');
    const candidate = clean.endsWith('/') ? join(out, clean, 'index.html') : join(out, clean);
    if (!existsSync(candidate) && !existsSync(`${candidate}.html`) && !existsSync(join(out, clean, 'index.html'))) missing.push(`${relative(out, page)} -> ${target}`);
  }
}
if (missing.length) { console.error(missing.join('\n')); process.exit(1); }
console.log(`Checked ${pages.length} generated pages; internal links are valid.`);
