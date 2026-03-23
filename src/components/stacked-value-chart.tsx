"use client";

import { useState } from "react";

type ChartItem = {
  label: string;
  total: number;
  profit: number;
  owed: number;
  count?: number;
  totalDisplay: string;
  profitDisplay: string;
  owedDisplay: string;
};

export function StackedValueChart({
  items,
  totalLabel,
  profitLabel,
  owedLabel
}: {
  items: ChartItem[];
  totalLabel: string;
  profitLabel: string;
  owedLabel: string;
}) {
  const max = Math.max(...items.map((item) => item.total), 1);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  return (
    <div className="stacked-chart">
      <div className="stacked-chart-grid" aria-hidden="true">
        {[100, 75, 50, 25, 0].map((tick) => (
          <div key={tick} className="stacked-chart-grid-line">
            <span>{tick}%</span>
          </div>
        ))}
      </div>
      <div className="stacked-chart-bars" style={{ ["--bar-count" as string]: String(items.length) }}>
        {items.map((item) => {
          const totalHeight = Math.max((item.total / max) * 100, item.total > 0 ? 10 : 0);
          const profitRatio = item.total > 0 ? item.profit / item.total : 0;
          const profitHeight = Math.max(profitRatio * totalHeight, item.profit > 0 ? 7 : 0);
          const isActive = activeLabel === item.label;

          return (
            <div
              key={item.label}
              className={`stacked-chart-column ${isActive ? "is-active" : ""}`}
              onMouseEnter={() => setActiveLabel(item.label)}
              onMouseLeave={() => setActiveLabel(null)}
              onFocus={() => setActiveLabel(item.label)}
              onBlur={() => setActiveLabel(null)}
            >
              <div className="stacked-chart-bar-wrap">
                {isActive ? (
                  <div className="stacked-chart-tooltip" role="status">
                    <strong>{item.label}</strong>
                    <span>
                      {totalLabel}: {item.totalDisplay}
                    </span>
                    <span>
                      {profitLabel}: {item.profitDisplay}
                    </span>
                    <span>
                      {owedLabel}: {item.owedDisplay}
                    </span>
                    <span>Deals: {item.count ?? 0}</span>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="stacked-chart-bar-button"
                  aria-label={`${item.label}. ${totalLabel} ${item.totalDisplay}. ${profitLabel} ${item.profitDisplay}. ${owedLabel} ${item.owedDisplay}. ${item.count ?? 0} deals.`}
                >
                  <div className="stacked-chart-bar" style={{ height: `${totalHeight}%` }}>
                    <div className="stacked-chart-bar-total" />
                    <div className="stacked-chart-bar-profit" style={{ height: `${profitHeight}%` }} />
                  </div>
                </button>
              </div>
              <div className="stacked-chart-label" title={item.label}>
                {item.label}
              </div>
              <div className="stacked-chart-count">{item.count ?? 0} deals</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
