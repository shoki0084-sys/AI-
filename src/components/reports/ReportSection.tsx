export default function ReportSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card space-y-3">
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-base"
          aria-hidden
        >
          {icon}
        </span>
        <p className="section-title">{title}</p>
      </div>
      {children}
    </section>
  );
}
