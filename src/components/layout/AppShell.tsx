'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'ホーム', icon: '🏠' },
  { href: '/meals', label: '食事', icon: '🍱' },
  { href: '/workouts', label: '筋トレ', icon: '🏋️' },
  { href: '/weight', label: '体重', icon: '⚖️' },
  { href: '/advice', label: 'AI', icon: '🤖' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = pathname !== '/login';

  return (
    <>
      <div className={showNav ? 'mx-auto max-w-screen-sm pb-20' : undefined}>
        {children}
      </div>

      {showNav && (
        <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-white/95 backdrop-blur">
          <ul className="mx-auto flex max-w-screen-sm justify-between px-2 py-2">
            {NAV.map((item) => (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[11px] text-gray-600 active:bg-gray-100"
                >
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
