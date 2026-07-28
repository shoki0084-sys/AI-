import AdvicePanel from '@/components/advice/AdvicePanel';
import WeeklyAdvicePanel from '@/components/advice/WeeklyAdvicePanel';
import DailyCommentForm from '@/components/daily-comments/DailyCommentForm';

export default function AdvicePage() {
  return (
    <main className="page-main">
      <header className="pt-2">
        <h1 className="page-title">AIアドバイス</h1>
      </header>
      <DailyCommentForm />
      <WeeklyAdvicePanel />
      <AdvicePanel />
    </main>
  );
}
