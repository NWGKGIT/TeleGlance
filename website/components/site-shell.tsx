import Link from 'next/link';

const pythonLinks = [
  ['Getting started', '/python/getting-started'],
  ['API reference', '/python/api-reference'],
  ['Checkpoints', '/python/checkpoints'],
  ['Media downloads', '/python/media-downloads'],
  ['Customization', '/python/advanced-customization'],
] as const;

export function SiteShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>
    <header className="topbar">
      <Link className="brand" href="/">TeleGlance</Link><span className="version">v0.1.1</span><div className="topbar-spacer" />
      <nav className="topnav" aria-label="Primary navigation"><Link href="/python/getting-started">Python</Link><Link href="/typescript">TypeScript</Link><a href="https://github.com/NWGKGIT/TeleGlance" target="_blank" rel="noreferrer">GitHub</a></nav>
      <div className="install-chip"><span>$</span><code>npm install teleglance</code></div>
    </header>
    <div className="site-layout">
      <aside className="sidebar" aria-label="Documentation navigation">
        <div className="sidebar-section"><span className="sidebar-label">Overview</span><Link className="side-link" href="/">Home</Link></div>
        <div className="sidebar-section"><span className="sidebar-label">Languages</span><Link className="side-link language-link" href="/python/getting-started"><span className="language-dot python-dot" />Python</Link><Link className="side-link language-link" href="/typescript"><span className="language-dot typescript-dot" />TypeScript</Link></div>
        <div className="sidebar-section"><span className="sidebar-label">Python guides</span>{pythonLinks.map(([label, href]) => <Link className="side-link" href={href} key={href}>{label}</Link>)}</div>
        <div className="sidebar-section sidebar-project"><span className="sidebar-label">Project</span><a className="side-link" href="https://pypi.org/project/teleglance/" target="_blank" rel="noreferrer">PyPI ↗</a><a className="side-link" href="https://www.npmjs.com/package/teleglance" target="_blank" rel="noreferrer">npm ↗</a><a className="side-link" href="https://github.com/NWGKGIT/TeleGlance" target="_blank" rel="noreferrer">Source ↗</a></div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  </>;
}
