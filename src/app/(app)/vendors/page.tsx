import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import { dealAccessWhere, vendorAccessWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";

export default async function VendorsPage() {
  const user = await requireUser();
  const vendors = await prisma.vendor.findMany({
    where: vendorAccessWhere(user),
    include: {
      deals: {
        where: dealAccessWhere(user),
        orderBy: { dealDate: "desc" }
      }
    },
    orderBy: { name: "asc" }
  });

  return (
    <div className="stack">
      <div className="row-between">
        <p className="subtitle">Every vendor listed with their deals, banking, and contract access.</p>
        <Link href="/vendors/new" className="button">
          New vendor
        </Link>
      </div>
      <div className="grid cards-3">
        {vendors.map((vendor) => (
          <section key={vendor.id} className="card stack">
            <div className="row-between">
              <strong>{vendor.name}</strong>
              <span className={`badge ${vendor.active ? "success" : "danger"}`}>{vendor.active ? "Active" : "Inactive"}</span>
            </div>
            <p className="helper">{vendor.contactName || "No contact"}</p>
            <p className="helper">{vendor.email || "No email"} • {vendor.phone || "No phone"}</p>
            <p className="helper">{vendor.deals.length} deal{vendor.deals.length === 1 ? "" : "s"} • Total owed {formatCurrency(vendor.deals.reduce((sum, deal) => sum + deal.amountOwedToVendor, 0))}</p>
            <div className="row">
              <Link href={`/vendors/${vendor.id}`} className="button-secondary">
                Details
              </Link>
              {vendor.email ? (
                <Link href={`/email/single?to=${encodeURIComponent(vendor.email)}&name=${encodeURIComponent(vendor.contactName || vendor.name)}`} className="button-secondary">
                  Email
                </Link>
              ) : null}
              <Link href={`/deals/new?vendorId=${vendor.id}`} className="button">
                Add deal
              </Link>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
