'use client';

export default function PageHeader({
  title,
  icon,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex justify-between items-center p-4 rounded-xl border animate-fade-in-up"
      style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)',
        borderColor: 'rgba(255,255,255,0.2)',
        boxShadow: '0 4px 14px rgba(46, 125, 50, 0.25)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 text-white">
          {icon}
        </span>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
      </div>
      {action}
    </div>
  );
}
