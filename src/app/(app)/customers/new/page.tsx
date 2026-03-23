import { CustomerForm } from "@/components/forms";
import { createCustomerAction } from "@/app/actions";

export default function NewCustomerPage() {
  return (
    <div className="stack">
      <p className="subtitle">Create a customer record that can be reused when entering deals.</p>
      <CustomerForm action={createCustomerAction} />
    </div>
  );
}
