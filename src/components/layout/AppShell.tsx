'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/', label: 'ホーム', icon: '🏠' },
  { href: '/meals', label: '食事', icon: '🍱' },
  { href: '/workouts', label: '筋トレ', icon: '🏋️' },
  { href: '/weight', label: '体重', icon: '⚖️' },
  { href: '/advice', label: 'AI', icon: '🤖' },
];

const TRAINER_NAV = { href: '/trainer', label: '顧客', icon: '👥' };

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = pathname !== '/login';
  const [isTrainer, setIsTrainer] = useState(false);

  useEffect(() => {
    if (!showNav) return;
    let active = true;
    fetch('/api/trainer/status')
      .then((res) => (res.ok ? res.json() : { isTrainer: false }))
      .then((data) => {
        if (active) setIsTrainer(Boolean(data?.isTrainer));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [showNav]);

  const navItems = isTrainer ? [...NAV, TRAINER_NAV] : NAV;

  return (
    <>
      <div className={showNav ? 'mx-auto max-w-screen-sm pb-[calc(4.5rem+env(safe-area-inset-bottom))]' : undefined}>
        {children}
      </div>

      {showNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] backdrop-blur-md">
          <ul className="mx-auto flex max-w-screen-sm justify-between px-1 pb-[env(safe-area-inset-bottom)] pt-1">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition active:scale-95 ${
                      active
                        ? 'text-blue-600'
                        : 'text-gray-500 active:bg-gray-50'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-xl text-lg leading-none transition ${
                        active ? 'bg-blue-50' : ''
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
}
