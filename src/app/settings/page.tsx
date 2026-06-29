import TargetWeightForm from '@/components/settings/TargetWeightForm';

export default function SettingsPage() {
  return (
    <main className="page-main">
      <header className="pt-2">
        <h1 className="page-title">設定</h1>
      </header>
      <TargetWeightForm />
    </main>
  );
}
