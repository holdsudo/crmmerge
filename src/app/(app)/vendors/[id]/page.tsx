import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency, formatPercent, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui";
import { dealAccessWhere, vendorAccessWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { appendSecurityEvent } from "@/lib/security";

type VendorDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ q?: string }>;
};

export default async function VendorDetailPage({ params, searchParams }: VendorDetailPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const filters = (await searchParams) ?? {};
  const q = filters.q?.trim() ?? "";
  const vendor = await prisma.vendor.findFirst({
    where: { id, ...vendorAccessWhere(user) },
    include: {
      deals: {
        where: dealAccessWhere(user),
        orderBy: { dealDate: "desc" }
      }
    }
  });

  if (!vendor) {
    notFound();
  }

  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "VENDOR_VIEWED",
    success: true,
    details: { vendorId: vendor.id }
  });

  const totalDeals = vendor.deals.length;
  const totalAmount = vendor.deals.reduce((sum, deal) => sum + deal.amountOwedToVendor, 0);
  const yourProfit = vendor.deals.reduce((sum, deal) => sum + deal.yourProfit, 0);
  const apr = totalDeals ? vendor.deals.reduce((sum, deal) => sum + deal.interestRate, 0) / totalDeals : 0;
  const filteredDeals = q
    ? vendor.deals.filter((deal) =>
        [
          deal.customerName,
          deal.coBuyerName,
          deal.buyerPhone,
          deal.buyerEmail,
          deal.vehicleMake,
          deal.vehicleModel,
          deal.carType,
          deal.lenderName,
          deal.notes,
          deal.fiProducts,
          deal.status
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q.toLowerCase()))
      )
    : vendor.deals;

  return (
    <div className="stack">
      <div className="row-between">
        <div>
          <p className="subtitle">
            {vendor.contactName || "No contact name"} • {vendor.email || "No email"} • {vendor.phone || "No phone"}
          </p>
        </div>
        <Link href={`/vendors/${vendor.id}/edit`} className="button-secondary">
          Edit vendor
        </Link>
      </div>

      <section className="grid cards-4">
        <div className="card">
          <span className="kicker">Total deals</span>
          <p className="metric">{totalDeals}</p>
        </div>
        <div className="card">
          <span className="kicker">Total amount owed</span>
          <p className="metric">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="card">
          <span className="kicker">Your profit</span>
          <p className="metric">{formatCurrency(yourProfit)}</p>
        </div>
        <div className="card">
          <span className="kicker">Average APR</span>
          <p className="metric">{formatPercent(apr)}</p>
        </div>
      </section>

      <section className="panel">
        <div className="row-between">
          <div>
            <span className="kicker">Deals</span>
            <h2 style={{ marginTop: 0 }}>All deals for {vendor.name}</h2>
          </div>
          <div className="row">
            <form className="inline-form" method="get">
              <input
                name="q"
                defaultValue={q}
                placeholder="Search customer, car, notes, status..."
                aria-label={`Search ${vendor.name} deals`}
              />
              <button className="button-secondary" type="submit">
                Search
              </button>
              {q ? (
                <Link href={`/vendors/${vendor.id}`} className="button-secondary">
                  Clear
                </Link>
              ) : null}
            </form>
            <Link href={`/deals/new?vendorId=${vendor.id}`} className="button">
              Add deal
            </Link>
          </div>
        </div>
        {filteredDeals.length === 0 ? (
          <div className="empty">{q ? `No deals matched "${q}" for ${vendor.name}.` : "No deals have been created for this vendor yet."}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Term</th>
                  <th>APR</th>
                  <th>Interest</th>
                  <th>Amount</th>
                  <th>Contract</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.map((deal) => (
                  <tr key={deal.id}>
                    <td>
                      <Link href={`/deals/${deal.id}`}>{deal.customerName}</Link>
                    </td>
                    <td>{[deal.vehicleYear, deal.vehicleMake, deal.vehicleModel || deal.carType].filter(Boolean).join(" ")}</td>
                    <td>{deal.termMonths ? `${deal.termMonths} mo` : "TBD"}</td>
                    <td>{formatPercent(deal.interestRate)}</td>
                    <td>{deal.interestAmount ? formatCurrency(deal.interestAmount) : "TBD"}</td>
                    <td>{formatCurrency(deal.amountOwedToVendor)}</td>
                    <td>
                      {deal.contractFilePath ? (
                        <Link className="link" href={`/api/contracts/${deal.contractFilePath}`}>
                          View
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <StatusBadge value={deal.status} />
                    </td>
                    <td>{formatDate(deal.dealDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
