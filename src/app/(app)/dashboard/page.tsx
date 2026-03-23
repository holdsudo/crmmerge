import Link from "next/link";
import { startOfMonth } from "date-fns";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatPercent, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui";
import { dealAccessWhere } from "@/lib/access";

export default async function DashboardPage() {
  const user = await requireUser();
  const monthStart = startOfMonth(new Date());

  const [thisMonthDeals, recentDeals, vendorProfitRollup] = await Promise.all([
    prisma.deal.findMany({
      where: { dealDate: { gte: monthStart }, ...dealAccessWhere(user) },
      include: { vendor: true },
      orderBy: { dealDate: "desc" }
    }),
    prisma.deal.findMany({
      where: dealAccessWhere(user),
      include: { vendor: true },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    prisma.vendor.findMany({
      where: {
        deals: {
          some: dealAccessWhere(user)
        }
      },
      include: {
        deals: {
          where: dealAccessWhere(user),
          select: { yourProfit: true }
        }
      }
    })
  ]);

  const totals = thisMonthDeals.reduce(
    (acc, deal) => {
      acc.deals += 1;
      acc.amountOwedToVendor += deal.amountOwedToVendor;
      acc.yourProfit += deal.yourProfit;
      acc.interestRate += deal.interestRate;
      return acc;
    },
    { deals: 0, amountOwedToVendor: 0, yourProfit: 0, interestRate: 0 }
  );

  const topVendors = vendorProfitRollup
    .map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      totalProfit: vendor.deals.reduce((sum, deal) => sum + deal.yourProfit, 0)
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .slice(0, 5);

  return (
    <div className="stack">
      <section className="grid cards-4">
        <div className="card">
          <span className="kicker">Deals this month</span>
          <p className="metric">{totals.deals}</p>
        </div>
        <div className="card">
          <span className="kicker">Amount owed</span>
          <p className="metric">{formatCurrency(totals.amountOwedToVendor)}</p>
        </div>
        <div className="card">
          <span className="kicker">Your profit</span>
          <p className="metric">{formatCurrency(totals.yourProfit)}</p>
        </div>
        <div className="card">
          <span className="kicker">Average APR</span>
          <p className="metric">{formatPercent(totals.deals ? totals.interestRate / totals.deals : 0)}</p>
        </div>
      </section>

      <section className="grid cards-2">
        <div className="panel">
          <div className="row-between">
            <div>
              <span className="kicker">Top vendors by profit</span>
              <h2 style={{ marginTop: 0 }}>Vendor performance</h2>
            </div>
            <Link href="/vendors" className="button-secondary">
              View vendors
            </Link>
          </div>
          <div className="stack">
            {topVendors.map((vendor) => (
              <div key={vendor.id} className="row-between card">
                <div>
                  <strong>{vendor.name}</strong>
                </div>
                <div>{formatCurrency(vendor.totalProfit)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <span className="kicker">QuickBooks</span>
          <h2 style={{ marginTop: 0 }}>Sync queue</h2>
          <div className="stack">
            {recentDeals
              .filter((deal) => deal.status === "CLOSED" || deal.qbSyncStatus !== "NOT_SYNCED")
              .slice(0, 5)
              .map((deal) => (
                <div key={deal.id} className="row-between card">
                  <div>
                    <strong>{deal.customerName}</strong>
                    <div className="helper">{deal.vendor.name}</div>
                  </div>
                  <StatusBadge value={deal.qbSyncStatus} />
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="row-between">
          <div>
            <span className="kicker">Recent deals</span>
            <h2 style={{ marginTop: 0 }}>Latest activity</h2>
          </div>
          <div className="row">
            <Link className="button-secondary" href="/deals">
              All deals
            </Link>
            <Link className="button" href="/deals/new">
              New deal
            </Link>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Customer</th>
                <th>Amount owed</th>
                <th>Your profit</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentDeals.map((deal) => (
                <tr key={deal.id}>
                  <td>{deal.vendor.name}</td>
                  <td>
                    <Link href={`/deals/${deal.id}`}>{deal.customerName}</Link>
                  </td>
                  <td>{formatCurrency(deal.amountOwedToVendor)}</td>
                  <td>{formatCurrency(deal.yourProfit)}</td>
                  <td>
                    <StatusBadge value={deal.status} />
                  </td>
                  <td>{formatDate(deal.dealDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="helper">Signed in as {user.name}.</p>
      </section>
    </div>
  );
}
