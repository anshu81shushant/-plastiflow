'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Maps each page to what the FAB should do there. Add-type pages don't get a FAB
// (they're already the "add" screen), edit pages don't get one either.
const FAB_CONFIG = {
  '/dashboard': { href: '/orders/new', label: 'New order' },
  '/orders': { href: '/orders/new', label: 'New order' },
  '/remaining': { href: '/orders/new', label: 'New order' },
  '/materials': { href: '/materials/new', label: 'Add material' },
  '/machines': { href: '/machines/new', label: 'Add machine' },
};

export default function FloatingActionButton() {
  const pathname = usePathname();
  const config = FAB_CONFIG[pathname];

  if (!config) return null;

  return (
    <Link
      href={config.href}
      className="fab"
      aria-label={config.label}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}
