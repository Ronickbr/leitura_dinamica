"use client";

type MobileCardListProps = {
  children: React.ReactNode;
  testId?: string;
};

type MobileCardProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
  testId?: string;
};

type MobileDataPointProps = {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
};

export function MobileCardList({ children, testId }: MobileCardListProps) {
  return (
    <div className="mobile-card-list" data-testid={testId}>
      {children}
    </div>
  );
}

export function MobileCard({
  title,
  subtitle,
  badge,
  footer,
  onClick,
  children,
  testId,
}: MobileCardProps) {
  const content = (
    <>
      <div className="mobile-card-header">
        <div className="mobile-card-heading">
          <div className="mobile-card-title">{title}</div>
          {subtitle ? <div className="mobile-card-subtitle">{subtitle}</div> : null}
        </div>
        {badge ? <div className="mobile-card-badge">{badge}</div> : null}
      </div>
      <div className="mobile-card-content">{children}</div>
      {footer ? <div className="mobile-card-footer">{footer}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="glass-card mobile-card mobile-card-button"
        data-testid={testId}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="glass-card mobile-card" data-testid={testId}>
      {content}
    </div>
  );
}

export function MobileDataGrid({ children }: { children: React.ReactNode }) {
  return <div className="mobile-data-grid">{children}</div>;
}

export function MobileDataPoint({
  label,
  value,
  accent = false,
}: MobileDataPointProps) {
  return (
    <div className="mobile-data-point">
      <span className="mobile-data-label">{label}</span>
      <span className={accent ? "mobile-data-value mobile-data-value-accent" : "mobile-data-value"}>
        {value}
      </span>
    </div>
  );
}
