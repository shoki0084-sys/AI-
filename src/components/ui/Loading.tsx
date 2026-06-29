type SpinnerProps = {
  size?: 'sm' | 'md';
  className?: string;
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClass = size === 'sm' ? 'loading-spinner-sm' : 'loading-spinner';
  return (
    <span
      className={`${sizeClass} ${className}`.trim()}
      role="status"
      aria-hidden="true"
    />
  );
}

type LoadingBlockProps = {
  label?: string;
  className?: string;
};

export function LoadingBlock({ label = '読み込み中…', className = '' }: LoadingBlockProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 py-6 text-sm text-gray-500 ${className}`.trim()}
      role="status"
      aria-live="polite"
    >
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

type FormLoadingOverlayProps = {
  show: boolean;
  label: string;
};

export function FormLoadingOverlay({ show, label }: FormLoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <Spinner />
      <p className="mt-2 text-sm font-medium text-gray-600">{label}</p>
    </div>
  );
}

type ButtonLoadingContentProps = {
  loading: boolean;
  loadingLabel: string;
  children: React.ReactNode;
  spinnerOnDark?: boolean;
};

export function ButtonLoadingContent({
  loading,
  loadingLabel,
  children,
  spinnerOnDark = true,
}: ButtonLoadingContentProps) {
  if (loading) {
    return (
      <>
        <Spinner
          size="sm"
          className={spinnerOnDark ? 'mr-2 border-white' : 'mr-2'}
        />
        {loadingLabel}
      </>
    );
  }
  return <>{children}</>;
}
