export function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  let className = "badge";
  if (normalized.includes("closed") || normalized.includes("synced")) {
    className += " success";
  } else if (normalized.includes("failed") || normalized.includes("cancel")) {
    className += " danger";
  } else if (normalized.includes("pending")) {
    className += " warn";
  }

  return <span className={className}>{value.replaceAll("_", " ")}</span>;
}

export function MiniBarChart({
  items,
  formatValue
}: {
  items: Array<{ label: string; value: number }>;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="chart-stack">
      {items.map((item) => (
        <div key={item.label} className="chart-row">
          <div className="chart-label">{item.label}</div>
          <div className="chart-bar-track">
            <div className="chart-bar-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <div className="chart-value">{formatValue ? formatValue(item.value) : item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function StackedValueChart({
  items,
  totalLabel,
  profitLabel,
  formatValue
}: {
  items: Array<{ label: string; total: number; profit: number; count?: number }>;
  totalLabel: string;
  profitLabel: string;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(...items.map((item) => item.total), 1);

  return (
    <div className="stacked-chart">
      <div className="stacked-chart-grid" aria-hidden="true">
        {[100, 75, 50, 25, 0].map((tick) => (
          <div key={tick} className="stacked-chart-grid-line">
            <span>{tick}%</span>
          </div>
        ))}
      </div>
      <div className="stacked-chart-bars">
        {items.map((item) => {
          const totalHeight = Math.max((item.total / max) * 100, item.total > 0 ? 8 : 0);
          const profitHeight = item.total > 0 ? Math.max((item.profit / item.total) * totalHeight, item.profit > 0 ? 6 : 0) : 0;

          return (
            <div key={item.label} className="stacked-chart-column">
              <div className="stacked-chart-bar-wrap">
                <div
                  className="stacked-chart-bar"
                  title={`${item.label}: ${totalLabel} ${formatValue ? formatValue(item.total) : item.total}, ${profitLabel} ${formatValue ? formatValue(item.profit) : item.profit}`}
                  style={{ height: `${totalHeight}%` }}
                >
                  <div className="stacked-chart-bar-total" />
                  <div className="stacked-chart-bar-profit" style={{ height: `${profitHeight}%` }} />
                </div>
              </div>
              <div className="stacked-chart-label">{item.label}</div>
              <div className="stacked-chart-meta">
                <strong>{formatValue ? formatValue(item.total) : item.total}</strong>
                <span>
                  {profitLabel}: {formatValue ? formatValue(item.profit) : item.profit}
                  {item.count ? ` • ${item.count} deals` : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TrendSvg({
  points,
  color = "var(--accent)"
}: {
  points: number[];
  color?: string;
}) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const path = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * 100;
      const y = 100 - ((point - min) / range) * 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="trend-svg" preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function DonutChart({
  items
}: {
  items: Array<{ label: string; value: number; color: string }>;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  let offset = 0;
  const gradient = items
    .map((item) => {
      const start = (offset / total) * 100;
      offset += item.value;
      const end = (offset / total) * 100;
      return `${item.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="donut-wrap">
      <div className="donut-chart" style={{ background: `conic-gradient(${gradient})` }} />
      <div className="stack">
        {items.map((item) => (
          <div key={item.label} className="row" style={{ gap: 8 }}>
            <span className="legend-dot" style={{ background: item.color }} />
            <span className="helper">
              {item.label}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
