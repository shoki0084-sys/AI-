import Link from 'next/link';

const SHORTCUTS = [
  { href: '/meals', label: '食事を記録', icon: '🍱' },
  { href: '/workouts', label: '筋トレを記録', icon: '🏋️' },
  { href: '/weight', label: '体重を記録', icon: '⚖️' },
  { href: '/advice', label: 'AIアドバイス', icon: '🤖' },
];

export default function HomePage() {
  return (
    <main className="space-y-6 p-4">
      <header className="space-y-1 pt-4">
        <p className="text-sm text-gray-500">ようこそ</p>
        <h1 className="page-title">今日の記録を始めましょう</h1>
      </header>

      <section className="grid grid-cols-2 gap-3">
        {SHORTCUTS.map((s) => (
          <Link key={s.href} href={s.href} className="card flex flex-col items-start gap-2 active:bg-gray-50">
            <span className="text-3xl">{s.icon}</span>
            <span className="text-sm font-semibold">{s.label}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
