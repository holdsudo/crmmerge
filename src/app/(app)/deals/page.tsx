import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { StatusBadge } from "@/components/ui";
import { CAR_TYPE_OPTIONS } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { dealAccessWhere } from "@/lib/access";

type DealsPageProps = {
  searchParams: Promise<{
    vendor?: string;
    status?: string;
    carType?: string;
    dealDate?: string;
  }>;
};

const statusOptions = ["NEW", "PENDING", "APPROVED", "FUNDED", "CLOSED", "CANCELLED"];

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const vendors = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
  const deals = await prisma.deal.findMany({
    where: {
      ...dealAccessWhere(user),
      vendorId: params.vendor || undefined,
      status: (params.status as never) || undefined,
      carType: params.carType || undefined,
      dealDate: params.dealDate ? new Date(params.dealDate) : undefined
    },
    include: { vendor: true },
    orderBy: { dealDate: "desc" }
  });

  return (
    <div className="stack">
      <div className="row-between">
        <p className="subtitle">All deals across your vendors, now with term, rate, and contract details.</p>
        <Link href="/deals/new" className="button">
          New deal
        </Link>
      </div>

      <form className="panel stack">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="vendor">Vendor</label>
            <select id="vendor" name="vendor" defaultValue={params.vendor ?? ""}>
              <option value="">All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={params.status ?? ""}>
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="carType">Vehicle type</label>
            <select id="carType" name="carType" defaultValue={params.carType ?? ""}>
              <option value="">All vehicle types</option>
              {CAR_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="dealDate">Deal date</label>
            <input id="dealDate" name="dealDate" type="date" defaultValue={params.dealDate ?? ""} />
          </div>
        </div>
        <div className="row">
          <button className="button" type="submit">
            Apply filters
          </button>
          <Link className="button-secondary" href="/deals">
            Reset
          </Link>
        </div>
      </form>

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Deal ID</th>
                <th>Vendor</th>
                <th>Customer</th>
                <th>Vehicle</th>
                <th>Term</th>
                <th>APR</th>
                <th>Interest paid</th>
                <th>Amount owed</th>
                <th>Contract</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td>
                    <Link href={`/deals/${deal.id}`}>{deal.id.slice(0, 8)}</Link>
                  </td>
                  <td>{deal.vendor.name}</td>
                  <td>{deal.customerName}</td>
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
      </section>
    </div>
  );
}
