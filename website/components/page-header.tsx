import Link from 'next/link';

export function PageHeader({ eyebrow, title, description }: Readonly<{ eyebrow: string; title: string; description: string }>) {
  return <><div className="breadcrumb"><Link href="/">Home</Link><span>/</span><span>{eyebrow}</span></div><header className="page-header"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subtitle">{description}</p></header></>;
}
