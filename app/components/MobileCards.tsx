import { useState } from "react";

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
  collapsible?: boolean;
  defaultExpanded?: boolean;
};

type MobileDataPointProps = {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  color?: string;
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
  collapsible = false,
  defaultExpanded = true,
}: MobileCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpand = (e: React.MouseEvent) => {
    if (collapsible) {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    }
  };

  const content = (
    <>
      <div
        className={`mobile-card-header ${collapsible ? 'is-collapsible' : ''}`}
        onClick={collapsible ? toggleExpand : undefined}
      >
        <div className="mobile-card-heading">
          <div className="mobile-card-title">{title}</div>
          {subtitle ? <div className="mobile-card-subtitle">{subtitle}</div> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {badge ? <div className="mobile-card-badge">{badge}</div> : null}
          {collapsible && (
            <div className={`mobile-card-expand-icon ${isExpanded ? 'is-expanded' : ''}`}>
              ▼
            </div>
          )}
        </div>
      </div>

      <div className={`mobile-card-collapsible-wrapper ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}>
        <div className="mobile-card-content">{children}</div>
        {footer ? <div className="mobile-card-footer">{footer}</div> : null}
      </div>
    </>
  );

  if (onClick && !collapsible) {
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
    <div
      className={`glass-card mobile-card ${collapsible && !isExpanded ? 'is-collapsed' : ''}`}
      data-testid={testId}
      onClick={!collapsible ? onClick : undefined}
      style={onClick && !collapsible ? { cursor: 'pointer' } : undefined}
    >
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
  color,
}: MobileDataPointProps) {
  return (
    <div className="mobile-data-point">
      <span className="mobile-data-label">{label}</span>
      <span
        className={accent ? "mobile-data-value mobile-data-value-accent" : "mobile-data-value"}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
