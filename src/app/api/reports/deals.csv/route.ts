import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOrManager } from "@/lib/auth";
import { stringifyCsv } from "@/lib/csv";
import { appendSecurityEvent } from "@/lib/security";

export async function GET() {
  const user = await requireAdminOrManager();

  const deals = await prisma.deal.findMany({
    include: { vendor: true, assignedStaff: true },
    orderBy: { dealDate: "desc" }
  });

  const csv = stringifyCsv([
    [
      "Deal ID",
      "Vendor",
      "Customer",
      "Buyer Phone",
      "Buyer Email",
      "Co-Buyer",
      "Date",
      "Amount Owed To Vendor",
      "Down Payment",
      "Vehicle Type",
      "Year",
      "Make",
      "Model",
      "Interest Rate",
      "Your Profit",
      "F&I Products",
      "Status",
      "Assigned Staff",
      "Assigned Staff ID",
      "Lender Name",
      "Notes",
      "QuickBooks Status",
      "QuickBooks External ID"
    ],
    ...deals.map((deal) => [
      deal.id,
      deal.vendor.name,
      deal.customerName,
      deal.buyerPhone,
      deal.buyerEmail,
      deal.coBuyerName,
      new Date(deal.dealDate).toISOString().slice(0, 10),
      deal.amountOwedToVendor,
      deal.downPayment,
      deal.carType,
      deal.vehicleYear,
      deal.vehicleMake,
      deal.vehicleModel,
      deal.interestRate,
      deal.yourProfit,
      deal.fiProducts,
      deal.status,
      deal.assignedStaff?.name,
      deal.assignedStaffId,
      deal.lenderName,
      deal.notes,
      deal.qbSyncStatus,
      deal.qbExternalId
    ])
  ]);

  await appendSecurityEvent({
    userId: user.id,
    email: user.email,
    eventType: "REPORT_EXPORTED",
    success: true,
    details: { report: "deals.csv", rowCount: deals.length }
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="deals-export.csv"',
      "Cache-Control": "private, no-store"
    }
  });
}
