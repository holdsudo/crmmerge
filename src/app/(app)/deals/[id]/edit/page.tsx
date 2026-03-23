import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { updateDealAction } from "@/app/actions";
import { DealForm } from "@/components/forms";
import { requireUser } from "@/lib/auth";
import { dealAccessWhere, isPrivilegedRole } from "@/lib/access";

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [deal, vendors, customers, users, settings] = await Promise.all([
    prisma.deal.findFirst({ where: { id, ...dealAccessWhere(user) } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({
      where: isPrivilegedRole(user.role) ? undefined : { deals: { some: dealAccessWhere(user) } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, email: true, coBuyerName: true }
    }),
    prisma.user.findMany({
      where: isPrivilegedRole(user.role) ? undefined : { id: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true }
    }),
    getAppSettings()
  ]);

  if (!deal) {
    notFound();
  }

  const readOnly = deal.status === "CLOSED";

  return (
    <div className="stack">
      <p className="subtitle">
        {readOnly ? "Closed deals are read-only until an Admin reopens them by changing the status." : "Update vehicle details, F&I products, vendor amount owed, and sync state."}
      </p>
      <DealForm action={updateDealAction.bind(null, deal.id)} vendors={vendors} customers={customers} users={users} settings={settings} deal={deal} readOnly={readOnly} />
    </div>
  );
}
