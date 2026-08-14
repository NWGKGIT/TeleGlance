'use client';

import { useState } from 'react';

export function CodeBlock({ language, children }: Readonly<{ language: string; children: string }>) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return <div className="code-block"><div className="code-header"><span>{language}</span><button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button></div><pre><code>{children}</code></pre></div>;
}
