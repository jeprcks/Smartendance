interface StatsCardProps {
  label: string;
  value: number;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'caution';
}

const variantStyles = {
  default: {
    background: '[background-image:linear-gradient(135deg,var(--surface)_0%,var(--muted)_100%)]',
    border: 'border-[var(--border)]',
    text: 'text-[var(--foreground)]',
    label: 'text-[var(--muted-foreground)]',
    icon: 'text-[var(--primary)]',
    hover: 'hover:brightness-110 dark:hover:brightness-125',
    iconBg: '[background-color:color-mix(in_srgb,var(--primary)_10%,var(--surface)_90%)]',
    iconRing: '[--tw-ring-color:rgba(102,187,106,0.2)]'
  },
  success: {
    background: '[background-image:linear-gradient(135deg,color-mix(in_srgb,var(--surface)_95%,var(--primary)_5%)_0%,color-mix(in_srgb,var(--surface)_90%,var(--primary)_10%)_100%)]',
    border: 'border-[var(--border)]',
    text: 'text-[var(--primary)]',
    label: 'text-[var(--primary)]',
    icon: 'text-[var(--primary)]',
    hover: 'hover:brightness-110 dark:hover:brightness-125',
    iconBg: '[background-color:color-mix(in_srgb,var(--primary)_15%,var(--surface)_85%)]',
    iconRing: '[--tw-ring-color:rgba(102,187,106,0.3)]'
  },
  danger: {
    background: '[background-image:linear-gradient(135deg,color-mix(in_srgb,var(--surface)_95%,var(--destructive)_5%)_0%,color-mix(in_srgb,var(--surface)_90%,var(--destructive)_10%)_100%)]',
    border: 'border-[var(--border)]',
    text: 'text-[var(--destructive)]',
    label: 'text-[var(--destructive)]',
    icon: 'text-[var(--destructive)]',
    hover: 'hover:brightness-110 dark:hover:brightness-125',
    iconBg: '[background-color:color-mix(in_srgb,var(--destructive)_15%,var(--surface)_85%)]',
    iconRing: '[--tw-ring-color:rgba(255,82,82,0.3)]'
  },
  warning: {
    background: '[background-image:linear-gradient(135deg,color-mix(in_srgb,var(--surface)_95%,var(--accent)_5%)_0%,color-mix(in_srgb,var(--surface)_90%,var(--accent)_10%)_100%)]',
    border: 'border-[var(--border)]',
    text: 'text-[var(--accent)]',
    label: 'text-[var(--accent)]',
    icon: 'text-[var(--accent)]',
    hover: 'hover:brightness-110 dark:hover:brightness-125',
    iconBg: '[background-color:color-mix(in_srgb,var(--accent)_15%,var(--surface)_85%)]',
    iconRing: '[--tw-ring-color:rgba(255,193,7,0.3)]'
  },
  caution: {
    background: '[background-image:linear-gradient(135deg,color-mix(in_srgb,var(--surface)_95%,var(--error)_5%)_0%,color-mix(in_srgb,var(--surface)_90%,var(--error)_10%)_100%)]',
    border: 'border-[var(--border)]',
    text: 'text-[var(--error)]',
    label: 'text-[var(--error)]',
    icon: 'text-[var(--error)]',
    hover: 'hover:brightness-110 dark:hover:brightness-125',
    iconBg: '[background-color:color-mix(in_srgb,var(--error)_15%,var(--surface)_85%)]',
    iconRing: '[--tw-ring-color:rgba(230,81,0,0.3)]'
  }
};

const icons = {
  default: (className: string) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  success: (className: string) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  danger: (className: string) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (className: string) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  caution: (className: string) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
};

export default function StatsCard({ label, value, variant = 'default' }: StatsCardProps) {
  const styles = variantStyles[variant];
  const Icon = icons[variant];

  const getBackgroundGradient = (): React.CSSProperties => {
    const gradients: Record<string, string> = {
      default: 'linear-gradient(135deg, var(--surface) 0%, var(--muted) 100%)',
      success: 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, var(--primary) 5%) 0%, color-mix(in srgb, var(--surface) 90%, var(--primary) 10%) 100%)',
      danger: 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, var(--destructive) 5%) 0%, color-mix(in srgb, var(--surface) 90%, var(--destructive) 10%) 100%)',
      warning: 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, var(--accent) 5%) 0%, color-mix(in srgb, var(--surface) 90%, var(--accent) 10%) 100%)',
      caution: 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 95%, var(--error) 5%) 0%, color-mix(in srgb, var(--surface) 90%, var(--error) 10%) 100%)',
    };
    return { backgroundImage: gradients[variant] };
  };
  
  return (
    <div 
      className={`group p-5 rounded-xl border ${styles.border} shadow-sm hover:shadow-md ${styles.hover} transition-all duration-300 relative overflow-hidden`}
      style={getBackgroundGradient()}
    >
      <div className="flex justify-between items-start mb-3">
        <p className={`text-sm font-medium ${styles.label}`}>{label}</p>
        <div className={`p-2 rounded-lg ${styles.iconBg} group-hover:ring-4 ${styles.iconRing} transition-all duration-300`}>
          {Icon(`h-5 w-5 ${styles.icon} transform group-hover:scale-110 transition-transform duration-300`)}
        </div>
      </div>
      <h3 className={`text-2xl font-bold ${styles.text} transform group-hover:scale-105 transition-transform duration-300 relative z-10`}>
        {value}
      </h3>
    </div>
  );
}