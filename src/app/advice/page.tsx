import AdvicePanel from '@/components/advice/AdvicePanel';
import WeeklyAdvicePanel from '@/components/advice/WeeklyAdvicePanel';

export default function AdvicePage() {
  return (
    <main className="page-main">
      <header className="pt-2">
        <h1 className="page-title">AIアドバイス</h1>
      </header>
      <WeeklyAdvicePanel />
      <AdvicePanel />
    </main>
  );
}
