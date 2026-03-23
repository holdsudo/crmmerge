import { VendorForm } from "@/components/forms";
import { createVendorAction } from "@/app/actions";
import { requireAdminOrManager } from "@/lib/auth";

export default async function NewVendorPage() {
  await requireAdminOrManager();
  return (
    <div className="stack">
      <p className="subtitle">Create a new vendor profile with contact details and account status.</p>
      <VendorForm action={createVendorAction} />
    </div>
  );
}
