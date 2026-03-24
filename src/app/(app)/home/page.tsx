import { endOfMonth, endOfWeek, format, isSameDay, startOfMonth, startOfWeek, subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { getAppSettings } from "@/lib/app-settings";
import { DonutChart, MiniBarChart } from "@/components/ui";
import { StackedValueChart } from "@/components/stacked-value-chart";
import { requireUser } from "@/lib/auth";
import { dealAccessWhere, vendorAccessWhere } from "@/lib/access";

type HomePageProps = {
  searchParams?: Promise<{ range?: string }>;
};

function clampRange(value: string | undefined, fallback: string) {
  return ["day", "week", "month", "year"].includes(value ?? "") ? (value as "day" | "week" | "month" | "year") : (["day", "week", "month", "year"].includes(fallback) ? (fallback as "day" | "week" | "month" | "year") : "month");
}

export default async function HomeOverviewPage({ searchParams }: HomePageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const [deals, vendors, settings] = await Promise.all([
    prisma.deal.findMany({ where: dealAccessWhere(user), include: { vendor: true }, orderBy: { dealDate: "asc" } }),
    prisma.vendor.findMany({ where: vendorAccessWhere(user), include: { deals: { where: dealAccessWhere(user) } }, orderBy: { name: "asc" } }),
    getAppSettings()
  ]);
  const selectedRange = clampRange(params.range, settings.homeChartDefaultRange);

  const monthStart = startOfMonth(new Date());
  const weekStart = subDays(new Date(), 7);
  const monthDeals = deals.filter((deal) => new Date(deal.dealDate) >= monthStart);
  const weekDeals = deals.filter((deal) => new Date(deal.dealDate) >= weekStart);

  const kpis = {
    monthDeals: monthDeals.length,
    weekDeals: weekDeals.length,
    monthAmount: monthDeals.reduce((sum, deal) => sum + deal.amountOwedToVendor, 0),
    monthProfit: monthDeals.reduce((sum, deal) => sum + deal.yourProfit, 0)
  };

  const statusCounts = ["NEW", "PENDING", "APPROVED", "FUNDED", "CLOSED", "CANCELLED"].map((status, index) => ({
    label: status,
    value: deals.filter((deal) => deal.status === status).length,
    color: ["#8a4b22", "#d98c38", "#26734d", "#145a86", "#5b7f2b", "#a73121"][index]
  }));

  const vendorBars = vendors
    .map((vendor) => ({
      label: vendor.name.split(" ")[0],
      value: vendor.deals.reduce((sum, deal) => sum + deal.yourProfit, 0)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const now = new Date();
  const chartItems = {
    day: Array.from({ length: 7 }, (_, index) => {
      const day = subDays(now, 6 - index);
      const bucketDeals = deals.filter((deal) => isSameDay(new Date(deal.dealDate), day));
      return {
        label: format(day, "EEE"),
        total: bucketDeals.reduce((sum, deal) => sum + deal.amountOwedToVendor + deal.yourProfit, 0),
        profit: bucketDeals.reduce((sum, deal) => sum + deal.yourProfit, 0),
        count: bucketDeals.length
      };
    }),
    week: Array.from({ length: 8 }, (_, index) => {
      const anchor = subDays(now, (7 - index) * 7);
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      const end = endOfWeek(anchor, { weekStartsOn: 1 });
      const bucketDeals = deals.filter((deal) => {
        const date = new Date(deal.dealDate);
        return date >= start && date <= end;
      });
      return {
        label: format(start, "MMM d"),
        total: bucketDeals.reduce((sum, deal) => sum + deal.amountOwedToVendor + deal.yourProfit, 0),
        profit: bucketDeals.reduce((sum, deal) => sum + deal.yourProfit, 0),
        count: bucketDeals.length
      };
    }),
    month: Array.from({ length: 6 }, (_, index) => {
      const year = now.getFullYear();
      const monthOffset = now.getMonth() - (5 - index);
      const start = new Date(year, monthOffset, 1);
      const end = endOfMonth(start);
      const bucketDeals = deals.filter((deal) => {
        const date = new Date(deal.dealDate);
        return date >= start && date <= end;
      });
      return {
        label: format(start, "MMM"),
        total: bucketDeals.reduce((sum, deal) => sum + deal.amountOwedToVendor + deal.yourProfit, 0),
        profit: bucketDeals.reduce((sum, deal) => sum + deal.yourProfit, 0),
        count: bucketDeals.length
      };
    }),
    year: Array.from({ length: 4 }, (_, index) => {
      const year = now.getFullYear() - (3 - index);
      const bucketDeals = deals.filter((deal) => new Date(deal.dealDate).getFullYear() === year);
      return {
        label: String(year),
        total: bucketDeals.reduce((sum, deal) => sum + deal.amountOwedToVendor + deal.yourProfit, 0),
        profit: bucketDeals.reduce((sum, deal) => sum + deal.yourProfit, 0),
        count: bucketDeals.length
      };
    })
  }[selectedRange].map((item) => ({
    ...item,
    owed: item.total - item.profit,
    totalDisplay: formatCurrency(item.total),
    profitDisplay: formatCurrency(item.profit),
    owedDisplay: formatCurrency(item.total - item.profit)
  }));

  const fiCounts = [
    { label: "GAP", value: deals.filter((deal) => deal.fiProducts?.includes("GAP")).length },
    { label: "VSC", value: deals.filter((deal) => deal.fiProducts?.includes("VSC")).length },
    { label: "Wear/Tear", value: deals.filter((deal) => deal.fiProducts?.includes("WEAR_TEAR")).length },
    { label: "Tire/Wheel", value: deals.filter((deal) => deal.fiProducts?.includes("TIRE_WHEEL")).length }
  ];

  return (
    <div className="stack">
      <section className="hero-panel">
        <div className="hero-copy stack">
          <div>
            <span className="kicker">Champion Auto Finance</span>
            <h2 style={{ margin: "6px 0 10px" }}>Funding, vendor operations, and outreach in one branded workspace.</h2>
            <p className="subtitle" style={{ marginTop: 0 }}>
              Track deal flow, monitor vendor performance, and manage campaign activity from the same operating screen your team uses every day.
            </p>
          </div>
          <div className="hero-stat-row">
            <div className="hero-stat">
              <span className="kicker">Active vendors</span>
              <strong>{vendors.length}</strong>
            </div>
            <div className="hero-stat">
              <span className="kicker">Monthly deals</span>
              <strong>{kpis.monthDeals}</strong>
            </div>
            <div className="hero-stat">
              <span className="kicker">Monthly profit</span>
              <strong>{formatCurrency(kpis.monthProfit)}</strong>
            </div>
          </div>
        </div>
        <div className="hero-visual panel">
          <img src="/brand/champion-logo-transparent.png" alt="Champion Auto Finance" className="hero-logo" />
          <div className="hero-visual-grid">
            <div>
              <span className="kicker">Month owed</span>
              <strong>{formatCurrency(kpis.monthAmount)}</strong>
            </div>
            <div>
              <span className="kicker">Week volume</span>
              <strong>{kpis.weekDeals} deals</strong>
            </div>
            <div>
              <span className="kicker">View mode</span>
              <strong>{selectedRange}</strong>
            </div>
            <div>
              <span className="kicker">Workspace</span>
              <strong>Champion CRM</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="panel row-between">
        <div>
          <span className="kicker">Home</span>
          <h2 style={{ margin: "6px 0 0" }}>{settings.homePageHeadline}</h2>
        </div>
        <div className="segmented-control">
          {[
            { value: "day", label: "Daily" },
            { value: "week", label: "Weekly" },
            { value: "month", label: "Monthly" },
            { value: "year", label: "Yearly" }
          ].map((option) => (
            <a key={option.value} href={`/home?range=${option.value}`} className={selectedRange === option.value ? "is-active" : ""}>
              {option.label}
            </a>
          ))}
        </div>
      </section>

      <section className="grid cards-4">
        <div className="card">
          <span className="kicker">Deals this month</span>
          <p className="metric">{kpis.monthDeals}</p>
        </div>
        <div className="card">
          <span className="kicker">Deals this week</span>
          <p className="metric">{kpis.weekDeals}</p>
        </div>
        <div className="card">
          <span className="kicker">Amount owed this month</span>
          <p className="metric">{formatCurrency(kpis.monthAmount)}</p>
        </div>
        <div className="card">
          <span className="kicker">Profit this month</span>
          <p className="metric">{formatCurrency(kpis.monthProfit)}</p>
        </div>
      </section>

      <section className="grid cards-2">
        <div className="panel stack">
          <span className="kicker">
            {selectedRange.charAt(0).toUpperCase()}
            {selectedRange.slice(1)} {settings.dealValueLabel.toLowerCase()} vs {settings.homeProfitLabel.toLowerCase()}
          </span>
          <StackedValueChart
            items={chartItems}
            totalLabel={settings.dealValueLabel}
            profitLabel={settings.homeProfitLabel}
            owedLabel="Amount owed"
          />
        </div>
        <div className="panel stack">
          <span className="kicker">Deal status mix</span>
          <DonutChart items={statusCounts} />
        </div>
      </section>

      <section className="grid cards-2">
        <div className="panel stack">
          <span className="kicker">Top vendors by profit</span>
          <MiniBarChart items={vendorBars} formatValue={formatCurrency} />
        </div>
        <div className="panel stack">
          <span className="kicker">F&I attachment counts</span>
          <MiniBarChart items={fiCounts} />
        </div>
      </section>
    </div>
  );
}
