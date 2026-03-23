import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { VendorForm } from "@/components/forms";
import { updateVendorAction } from "@/app/actions";
import { requireAdminOrManager } from "@/lib/auth";

export default async function EditVendorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminOrManager();
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) {
    notFound();
  }

  return (
    <div className="stack">
      <p className="subtitle">Update vendor contact details and account status.</p>
      <VendorForm action={updateVendorAction.bind(null, vendor.id)} vendor={vendor} />
    </div>
  );
}
