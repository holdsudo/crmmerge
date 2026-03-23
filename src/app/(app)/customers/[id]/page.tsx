import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { customerAccessWhere, dealAccessWhere } from "@/lib/access";
import { appendSecurityEvent } from "@/lib/security";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, ...customerAccessWhere(user) },
    include: { deals: { where: dealAccessWhere(user), include: { vendor: true }, orderBy: { dealDate: "desc" } } }
  });

  if (!customer) {
    notFound();
  }

  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "CUSTOMER_VIEWED",
    success: true,
    details: { customerId: customer.id }
  });

  return (
    <div className="stack">
      <div className="row-between">
        <p className="subtitle">{customer.phone || "No phone"} • {customer.email || "No email"} • {customer.coBuyerName || "No co-buyer"}</p>
        <div className="row">
          <Link href={`/deals/new?customerId=${customer.id}`} className="button">
            New deal for customer
          </Link>
          <Link href={`/customers/${customer.id}/edit`} className="button-secondary">
            Edit customer
          </Link>
        </div>
      </div>

      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Deal</th>
                <th>Amount owed</th>
                <th>Your profit</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {customer.deals.map((deal) => (
                <tr key={deal.id}>
                  <td>{deal.vendor.name}</td>
                  <td>
                    <Link href={`/deals/${deal.id}`}>{deal.customerName}</Link>
                  </td>
                  <td>{formatCurrency(deal.amountOwedToVendor)}</td>
                  <td>{formatCurrency(deal.yourProfit)}</td>
                  <td><StatusBadge value={deal.status} /></td>
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
