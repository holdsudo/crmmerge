import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOrManager } from "@/lib/auth";
import { stringifyCsv } from "@/lib/csv";
import { appendSecurityEvent } from "@/lib/security";

export async function GET() {
  const user = await requireAdminOrManager();

  const vendors = await prisma.vendor.findMany({
    orderBy: { name: "asc" }
  });

  const csv = stringifyCsv([
    ["Name", "Contact Name", "Email", "Phone", "Active"],
    ...vendors.map((vendor) => [
      vendor.name,
      vendor.contactName,
      vendor.email,
      vendor.phone,
      vendor.active ? "true" : "false"
    ])
  ]);

  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "REPORT_EXPORTED",
    success: true,
    details: { report: "vendors.csv", rowCount: vendors.length }
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="vendors-export.csv"',
      "Cache-Control": "private, no-store"
    }
  });
}
