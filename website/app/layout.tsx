import type { Metadata } from 'next';
import { SiteShell } from '../components/site-shell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'TeleGlance — Public Telegram channels', template: '%s — TeleGlance' },
  description: 'Typed Python and TypeScript clients for public Telegram channels through t.me web previews.',
  metadataBase: new URL('https://nwgkgit.github.io/TeleGlance/'),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteShell>{children}</SiteShell></body></html>;
}
