interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-6"
      style={{
        background: "#1C90FB",
        height: "48px",
        flexShrink: 0,
      }}
    >
      <div className="flex items-center gap-3">
        <h2 className="text-white font-semibold text-base">{title}</h2>
        {subtitle && (
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>
            {subtitle}
          </span>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
