import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/app-settings";
import { DealForm } from "@/components/forms";
import { createDealAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { dealAccessWhere, isPrivilegedRole } from "@/lib/access";

type NewDealPageProps = {
  searchParams: Promise<{ vendorId?: string; customerId?: string }>;
};

export default async function NewDealPage({ searchParams }: NewDealPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const [vendors, customers, users, selectedCustomer, settings] = await Promise.all([
    prisma.vendor.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
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
    params.customerId
      ? prisma.customer.findFirst({
          where: {
            id: params.customerId,
            ...(isPrivilegedRole(user.role) ? {} : { deals: { some: dealAccessWhere(user) } })
          }
        })
      : Promise.resolve(null),
    getAppSettings()
  ]);

  return (
    <div className="stack">
      <p className="subtitle">Create a new deal with grouped buyer, vendor, vehicle, and accounting sections.</p>
      <DealForm
        action={createDealAction}
        vendors={vendors}
        customers={customers}
        users={users}
        settings={settings}
        defaultVendorId={params.vendorId}
        deal={
          selectedCustomer
            ? {
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.name,
                buyerPhone: selectedCustomer.phone,
                buyerEmail: selectedCustomer.email,
                coBuyerName: selectedCustomer.coBuyerName
              }
            : undefined
        }
      />
    </div>
  );
}
