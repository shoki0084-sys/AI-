import AdvicePanel from '@/components/advice/AdvicePanel';

export default function AdvicePage() {
  return (
    <main className="space-y-4 p-4">
      <header className="pt-4">
        <h1 className="page-title">AIアドバイス</h1>
      </header>
      <AdvicePanel />
    </main>
  );
}
