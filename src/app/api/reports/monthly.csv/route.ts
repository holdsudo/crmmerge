import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOrManager } from "@/lib/auth";
import { stringifyCsv } from "@/lib/csv";
import { appendSecurityEvent } from "@/lib/security";

export async function GET() {
  const user = await requireAdminOrManager();
  const deals = await prisma.deal.findMany({
    include: { vendor: true },
    orderBy: { dealDate: "desc" }
  });

  const header = [
    "Deal ID",
    "Vendor",
    "Customer",
    "Buyer Phone",
    "Buyer Email",
    "Date",
    "Amount Owed To Vendor",
    "Down Payment",
    "Vehicle Type",
    "Make",
    "Interest Rate",
    "Your Profit",
    "Status",
    "QuickBooks Status"
  ];

  const rows = deals.map((deal) => [
    deal.id,
    deal.vendor.name,
    deal.customerName,
    deal.buyerPhone,
    deal.buyerEmail,
    new Date(deal.dealDate).toISOString().slice(0, 10),
    deal.amountOwedToVendor,
    deal.downPayment,
    deal.carType,
    deal.vehicleMake,
    deal.interestRate,
    deal.yourProfit,
    deal.status,
    deal.qbSyncStatus
  ]);

  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "REPORT_EXPORTED",
    success: true,
    details: { report: "monthly.csv", rowCount: rows.length }
  });

  return new NextResponse(stringifyCsv([header, ...rows]), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="vendor-deals-report.csv"',
      "Cache-Control": "private, no-store"
    }
  });
}
