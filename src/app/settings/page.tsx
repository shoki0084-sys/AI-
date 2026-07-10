import TargetWeightForm from '@/components/settings/TargetWeightForm';
import TargetPfcForm from '@/components/settings/TargetPfcForm';

export default function SettingsPage() {
  return (
    <main className="page-main">
      <header className="pt-2">
        <h1 className="page-title">設定</h1>
      </header>
      <div className="space-y-4">
        <TargetWeightForm />
        <TargetPfcForm />
      </div>
    </main>
  );
}
