import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency, formatPercent } from "@/lib/format";
import { requireUser } from "@/lib/auth";
import { customerAccessWhere, dealAccessWhere } from "@/lib/access";

export default async function CustomersPage() {
  const user = await requireUser();
  const customers = await prisma.customer.findMany({
    where: customerAccessWhere(user),
    include: { deals: { where: dealAccessWhere(user), orderBy: { dealDate: "desc" } } },
    orderBy: { name: "asc" }
  });

  return (
    <div className="stack">
      <div className="row-between">
        <p className="subtitle">List view of buyers with a dropdown for every car/term they have.</p>
        <Link href="/customers/new" className="button">
          New customer
        </Link>
      </div>
      <section className="stack">
        {customers.map((customer) => (
          <details key={customer.id} className="panel stack" open>
            <summary>
              <div className="row-between">
                <div>
                  <strong>{customer.name}</strong>
                  <p className="helper" style={{ margin: 0 }}>
                    {customer.phone || "No phone"} • {customer.email || "No email"}
                  </p>
                </div>
                <div className="row">
                  {customer.email ? (
                    <Link className="button-secondary" href={`/email/single?to=${encodeURIComponent(customer.email)}&name=${encodeURIComponent(customer.name)}`}>
                      Email
                    </Link>
                  ) : null}
                  <Link className="button-secondary" href={`/customers/${customer.id}`}>
                    View profile
                  </Link>
                </div>
              </div>
              <div className="helper" style={{ marginTop: 4 }}>
                {customer.coBuyerName ? `Co-buyer: ${customer.coBuyerName}` : "No co-buyer"} • {customer.deals.length} deal{customer.deals.length === 1 ? "" : "s"}
              </div>
            </summary>
            {customer.deals.length === 0 ? (
              <div className="helper">No deals yet.</div>
            ) : (
              <div className="stack" style={{ marginTop: 12 }}>
                {customer.deals.map((deal) => (
                  <article key={deal.id} className="card" style={{ padding: "12px" }}>
                    <div className="row-between">
                      <span className="kicker">{deal.carType}</span>
                      <Link className="link" href={`/deals/${deal.id}`}>
                        Open deal
                      </Link>
                    </div>
                    <p className="helper" style={{ margin: 0 }}>
                      Vehicle: {[deal.vehicleYear, deal.vehicleMake, deal.vehicleModel].filter(Boolean).join(" ") || deal.carType}
                    </p>
                    <p className="helper" style={{ margin: 0 }}>
                      Term: {deal.termMonths ? `${deal.termMonths} mo` : "TBD"} • Rate: {formatPercent(deal.interestRate)}
                    </p>
                    <p className="helper" style={{ margin: 0 }}>
                      Interest paid: {deal.interestAmount ? formatCurrency(deal.interestAmount) : "TBD"} • Amount owed: {formatCurrency(deal.amountOwedToVendor)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </details>
        ))}
      </section>
    </div>
  );
}
