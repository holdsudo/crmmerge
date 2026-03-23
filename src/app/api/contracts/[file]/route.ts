import { NextResponse } from "next/server";
import path from "path";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appendSecurityEvent } from "@/lib/security";
import { dealAccessWhere } from "@/lib/access";
import { readContractFile } from "@/lib/contracts";

export async function GET(_req: Request, context: { params: Promise<{ file: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.active) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { file } = await context.params;
  const safeName = path.basename(file);
  const contractDeal = await prisma.deal.findFirst({
    where: { contractFilePath: safeName, ...dealAccessWhere(user) },
    select: { id: true }
  });

  if (!contractDeal) {
    return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  }

  try {
    const buffer = await readContractFile(safeName);
    const body = new Uint8Array(buffer);

    await appendSecurityEvent({
      userId: user.id,
      email: user.email,
      eventType: "CONTRACT_VIEWED",
      success: true,
      details: { dealId: contractDeal.id, file: safeName }
    });

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  }
}
