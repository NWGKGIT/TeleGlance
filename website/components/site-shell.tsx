'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const pythonLinks = [
  ['Getting started', '/py/getting-started'],
  ['API reference', '/py/api-reference'],
  ['Checkpoints', '/py/checkpoints'],
  ['Media downloads', '/py/media-downloads'],
  ['Live watching', '/py/live-watching'],
  ['Customization', '/py/customization'],
] as const;

const tsLinks = [
  ['Getting started', '/ts/getting-started'],
  ['API reference', '/ts/api-reference'],
  ['Checkpoints', '/ts/checkpoints'],
  ['Media downloads', '/ts/media-downloads'],
  ['Live watching', '/ts/live-watching'],
  ['Customization', '/ts/customization'],
] as const;

export function SiteShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isPython = pathname.startsWith('/py');
  const isTypeScript = pathname.startsWith('/ts');
  const showSidebar = isPython || isTypeScript;
  const links = isPython ? pythonLinks : isTypeScript ? tsLinks : [];

  return <>
    <header className="topbar">
      <Link className="brand" href="/">TeleGlance</Link>
      <span className="version">v0.1.1</span>
      <div className="topbar-spacer" />
      <nav className="topnav" aria-label="Primary navigation">
        <Link href="/py/getting-started">Python</Link>
        <Link href="/ts/getting-started">TypeScript</Link>
        <a href="https://github.com/NWGKGIT/TeleGlance" target="_blank" rel="noreferrer">GitHub</a>
      </nav>
      {isPython && (
        <div className="install-chip">
          <span>$</span>
          <code>pip install teleglance</code>
        </div>
      )}
      {isTypeScript && (
        <div className="install-chip">
          <span>$</span>
          <code>npm install teleglance</code>
        </div>
      )}
    </header>
    <div className="site-layout">
      {showSidebar && (
        <aside className="sidebar" aria-label="Documentation navigation">
          <div className="sidebar-section">
            <span className="sidebar-label">Overview</span>
            <Link className="side-link" href="/">Home</Link>
          </div>
          <div className="sidebar-section">
            <span className="sidebar-label">Languages</span>
            <Link className="side-link language-link" href="/py/getting-started">
              <span className="language-dot python-dot" />Python
            </Link>
            <Link className="side-link language-link" href="/ts/getting-started">
              <span className="language-dot typescript-dot" />TypeScript
            </Link>
          </div>
          <div className="sidebar-section">
            <span className="sidebar-label">{isPython ? 'Python' : 'TypeScript'} guides</span>
            {links.map(([label, href]) => (
              <Link className="side-link" href={href} key={href}>{label}</Link>
            ))}
          </div>
          <div className="sidebar-section">
            <span className="sidebar-label">Project</span>
            <a className="side-link" href="https://pypi.org/project/teleglance/" target="_blank" rel="noreferrer">
              PyPI ↗
            </a>
            <a className="side-link" href="https://www.npmjs.com/package/teleglance" target="_blank" rel="noreferrer">
              npm ↗
            </a>
            <a className="side-link" href="https://github.com/NWGKGIT/TeleGlance" target="_blank" rel="noreferrer">
              Source ↗
            </a>
          </div>
        </aside>
      )}
      <main className="main-content">{children}</main>
    </div>
  </>;
}
