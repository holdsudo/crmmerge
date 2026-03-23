import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate, formatPercent, toTitleCase } from "@/lib/format";
import { StatusBadge } from "@/components/ui";
import { deleteDealAction, reopenDealAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { FI_PRODUCT_OPTIONS } from "@/lib/constants";
import { dealAccessWhere } from "@/lib/access";
import { appendSecurityEvent } from "@/lib/security";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const deal = await prisma.deal.findFirst({
    where: { id, ...dealAccessWhere(user) },
    include: {
      vendor: true,
      customer: true,
      createdBy: true,
      assignedStaff: true,
      auditLogs: {
        include: { user: true },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!deal) {
    notFound();
  }

  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "DEAL_VIEWED",
    success: true,
    details: { dealId: deal.id }
  });

  const canDelete = ["ADMIN", "MANAGER"].includes(user.role);
  const canReopen = user.role === "ADMIN" && deal.status === "CLOSED";
  const fiProductLabels = deal.fiProducts
    ? deal.fiProducts
        .split(",")
        .filter(Boolean)
        .map((value) => FI_PRODUCT_OPTIONS.find((option) => option.value === value)?.label || value)
        .join(", ")
    : "None selected";

  return (
    <div className="stack">
      <div className="row-between">
        <div className="row">
          <Link href={`/vendors/${deal.vendorId}`} className="button-secondary">
            {deal.vendor.name}
          </Link>
          <StatusBadge value={deal.status} />
          <StatusBadge value={deal.qbSyncStatus} />
        </div>
        <div className="row">
          {canReopen ? (
            <form action={reopenDealAction.bind(null, deal.id)}>
              <button className="button-secondary" type="submit">
                Reopen deal
              </button>
            </form>
          ) : null}
          <Link href={`/deals/${deal.id}/edit`} className="button">
            Edit deal
          </Link>
          {canDelete ? (
            <form action={deleteDealAction.bind(null, deal.id)}>
              <button className="button-danger" type="submit">
                Delete
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <section className="grid cards-4">
        <div className="card">
          <span className="kicker">Amount owed</span>
          <p className="metric">{formatCurrency(deal.amountOwedToVendor)}</p>
        </div>
        <div className="card">
          <span className="kicker">Your profit</span>
          <p className="metric">{formatCurrency(deal.yourProfit)}</p>
        </div>
        <div className="card">
          <span className="kicker">Vehicle</span>
          <p className="metric">{[deal.vehicleYear, deal.vehicleMake, deal.vehicleModel || deal.carType].filter(Boolean).join(" ")}</p>
        </div>
        <div className="card">
          <span className="kicker">APR</span>
          <p className="metric">{formatPercent(deal.interestRate)}</p>
        </div>
      </section>

      <section className="grid cards-2">
        <div className="panel stack">
          <div className="row-between">
            <span className="kicker">Deal detail</span>
            <div className="helper">Deal ID {deal.id.slice(0, 8)}</div>
          </div>
          <div className="grid cards-2">
            <Detail label="Vendor" value={<Link href={`/vendors/${deal.vendorId}`}>{deal.vendor.name}</Link>} />
            <Detail
              label="Customer"
              value={deal.customerId ? <Link href={`/customers/${deal.customerId}`}>{deal.customerName}</Link> : deal.customerName}
            />
            <Detail label="Buyer phone" value={deal.buyerPhone || "Not set"} />
            <Detail label="Buyer email" value={deal.buyerEmail || "Not set"} />
            <Detail label="Co-buyer" value={deal.coBuyerName || "Not set"} />
            <Detail label="Deal date" value={formatDate(deal.dealDate)} />
            <Detail label="Term" value={deal.termMonths ? `${deal.termMonths} months` : "TBD"} />
            <Detail label="Interest paid" value={deal.interestAmount ? formatCurrency(deal.interestAmount) : "TBD"} />
            <Detail label="Down payment" value={deal.downPayment ? formatCurrency(deal.downPayment) : "Not set"} />
            <Detail label="Vehicle type" value={deal.carType} />
            <Detail label="Year" value={deal.vehicleYear ? String(deal.vehicleYear) : "Not set"} />
            <Detail label="Make" value={deal.vehicleMake || "Not set"} />
            <Detail label="Model" value={deal.vehicleModel || "Not set"} />
            <Detail label="Lender" value={deal.lenderName || "Not set"} />
            <Detail label="F&I products" value={fiProductLabels} />
            <Detail label="QuickBooks external ID" value={deal.qbExternalId || "Not synced"} />
            <Detail label="Assigned staff" value={deal.assignedStaff?.name || "Not assigned"} />
            <Detail label="Created by" value={deal.createdBy.name} />
            <Detail label="Updated at" value={formatDate(deal.updatedAt)} />
            <Detail
              label="Contract"
              value={
                deal.contractFilePath ? (
                  <Link href={`/api/contracts/${deal.contractFilePath}`}>{deal.contractFileName || "View contract"}</Link>
                ) : (
                  "Not uploaded"
                )
              }
            />
          </div>
          <div>
            <span className="kicker">Notes</span>
            <p style={{ marginTop: 0 }}>{deal.notes || "No notes yet."}</p>
          </div>
        </div>

        <div className="panel stack">
          <span className="kicker">Audit notes</span>
          {deal.auditLogs.length === 0 ? (
            <div className="empty">No audit entries yet.</div>
          ) : (
            deal.auditLogs.map((entry) => (
              <div key={entry.id} className="card stack">
                <div className="row-between">
                  <strong>{toTitleCase(entry.action)}</strong>
                  <span className="helper">{formatDate(entry.createdAt)}</span>
                </div>
                <div className="helper">By {entry.user.name}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="card">
      <span className="kicker">{label}</span>
      <div>{value}</div>
    </div>
  );
}
