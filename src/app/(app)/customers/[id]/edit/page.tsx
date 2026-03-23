import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CustomerForm } from "@/components/forms";
import { updateCustomerAction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { customerAccessWhere } from "@/lib/access";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const customer = await prisma.customer.findFirst({ where: { id, ...customerAccessWhere(user) } });

  if (!customer) {
    notFound();
  }

  return (
    <div className="stack">
      <p className="subtitle">Update customer contact information and co-buyer details.</p>
      <CustomerForm action={updateCustomerAction.bind(null, customer.id)} customer={customer} />
    </div>
  );
}
