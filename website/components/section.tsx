export function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return <section className="doc-section"><h2>{title}</h2>{children}</section>;
}
