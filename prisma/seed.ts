import bcrypt from "bcryptjs";
import { PrismaClient, DealStatus, QbSyncStatus, UserRole } from "@prisma/client";
import { subDays } from "date-fns";
import crypto from "crypto";

const prisma = new PrismaClient();

function seedHash(payload: string) {
  return crypto.createHash("sha256").update(payload).digest("hex");
}

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const managerPassword = process.env.SEED_MANAGER_PASSWORD;
  const staffPassword = process.env.SEED_STAFF_PASSWORD;

  if (!adminPassword || !managerPassword || !staffPassword) {
    throw new Error("Set SEED_ADMIN_PASSWORD, SEED_MANAGER_PASSWORD, and SEED_STAFF_PASSWORD before seeding.");
  }

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@crm.local" },
      update: { active: true },
      create: {
        name: "Admin User",
        email: "admin@crm.local",
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: UserRole.ADMIN,
        active: true
      }
    }),
    prisma.user.upsert({
      where: { email: "manager@crm.local" },
      update: { active: true },
      create: {
        name: "Manager User",
        email: "manager@crm.local",
        passwordHash: await bcrypt.hash(managerPassword, 12),
        role: UserRole.MANAGER,
        active: true
      }
    }),
    prisma.user.upsert({
      where: { email: "staff@crm.local" },
      update: { active: true },
      create: {
        name: "Staff User",
        email: "staff@crm.local",
        passwordHash: await bcrypt.hash(staffPassword, 12),
        role: UserRole.STAFF,
        active: true
      }
    })
  ]);

  const vendors = await Promise.all([
    prisma.vendor.upsert({
      where: { id: "vendor-atlas-auto" },
      update: {},
      create: {
        id: "vendor-atlas-auto",
        name: "Atlas Auto Finance",
        contactName: "Renee Gordon",
        email: "atlas@example.com",
        phone: "555-0141"
      }
    }),
    prisma.vendor.upsert({
      where: { id: "vendor-harbor-credit" },
      update: {},
      create: {
        id: "vendor-harbor-credit",
        name: "Harbor Credit Group",
        contactName: "Mason Blake",
        email: "harbor@example.com",
        phone: "555-0176"
      }
    }),
    prisma.vendor.upsert({
      where: { id: "vendor-summit-lending" },
      update: {},
      create: {
        id: "vendor-summit-lending",
        name: "Summit Lending",
        contactName: "Tara Hughes",
        email: "summit@example.com",
        phone: "555-0193"
      }
    })
  ]);

  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: "customer-jordan-miles" },
      update: {},
      create: {
        id: "customer-jordan-miles",
        name: "Jordan Miles",
        phone: "555-2001",
        email: "jordan.miles@example.com",
        coBuyerName: "Taylor Miles"
      }
    }),
    prisma.customer.upsert({
      where: { id: "customer-avery-stone" },
      update: {},
      create: {
        id: "customer-avery-stone",
        name: "Avery Stone",
        phone: "555-2002",
        email: "avery.stone@example.com"
      }
    }),
    prisma.customer.upsert({
      where: { id: "customer-casey-nguyen" },
      update: {},
      create: {
        id: "customer-casey-nguyen",
        name: "Casey Nguyen",
        phone: "555-2003",
        email: "casey.nguyen@example.com",
        coBuyerName: "Robin Nguyen"
      }
    })
  ]);

  const existing = await prisma.deal.count();
  if (existing === 0) {
    const deals = [
      {
        vendorId: vendors[0].id,
        customerId: customers[0].id,
        customerName: "Jordan Miles",
        buyerPhone: "555-2001",
        buyerEmail: "jordan.miles@example.com",
        coBuyerName: "Taylor Miles",
        dealDate: subDays(new Date(), 2),
        amountOwedToVendor: 22850,
        downPayment: 2500,
        termMonths: 72,
        interestAmount: 4200,
        carType: "SUV",
        vehicleYear: 2021,
        vehicleMake: "Ford",
        vehicleModel: "Explorer",
        interestRate: 9.25,
        yourProfit: 2400,
        contractFileName: "atlas-suv-contract.pdf",
        fiProducts: "GAP,TIRE_WHEEL,WEAR_TEAR",
        status: DealStatus.FUNDED,
        lenderName: "Capital Drive Bank",
        notes: "Docs received and funded.",
        qbSyncStatus: QbSyncStatus.PENDING
      },
      {
        vendorId: vendors[1].id,
        customerId: customers[1].id,
        customerName: "Avery Stone",
        buyerPhone: "555-2002",
        buyerEmail: "avery.stone@example.com",
        dealDate: subDays(new Date(), 6),
        amountOwedToVendor: 18400,
        downPayment: 1500,
        termMonths: 60,
        interestAmount: 4200,
        carType: "Sedan",
        vehicleYear: 2020,
        vehicleMake: "Toyota",
        vehicleModel: "Camry",
        interestRate: 11.4,
        yourProfit: 1800,
        contractFileName: "harbor-camry-contract.pdf",
        fiProducts: "GAP,VSC",
        status: DealStatus.CLOSED,
        lenderName: "First Metro Auto",
        notes: "Ready for QuickBooks sync.",
        qbSyncStatus: QbSyncStatus.NOT_SYNCED
      },
      {
        vendorId: vendors[2].id,
        customerId: customers[2].id,
        customerName: "Casey Nguyen",
        buyerPhone: "555-2003",
        buyerEmail: "casey.nguyen@example.com",
        coBuyerName: "Robin Nguyen",
        dealDate: subDays(new Date(), 11),
        amountOwedToVendor: 31200,
        downPayment: 3000,
        termMonths: 84,
        interestAmount: 5000,
        carType: "Truck",
        vehicleYear: 2022,
        vehicleMake: "Ford",
        vehicleModel: "F-150",
        interestRate: 7.9,
        yourProfit: 3200,
        contractFileName: "summit-truck-contract.pdf",
        fiProducts: "MAINTENANCE,ROAD_HAZARD",
        status: DealStatus.APPROVED,
        lenderName: "Pioneer Lending",
        notes: "Awaiting funding callback.",
        qbSyncStatus: QbSyncStatus.NOT_SYNCED
      }
    ];

    for (const deal of deals) {
      const created = await prisma.deal.create({
        data: {
          ...deal,
          createdById: users[0].id,
          assignedStaffId: users[1].id,
          updatedById: users[0].id
        }
      });

      const previous = await prisma.auditLog.findFirst({
        orderBy: { createdAt: "desc" },
        select: { hash: true }
      });
      const previousHash = previous?.hash ?? null;
      await prisma.auditLog.create({
        data: {
          dealId: created.id,
          userId: users[0].id,
          action: "DEAL_CREATED",
          newValueJson: JSON.stringify(created),
          previousHash,
          hash: seedHash(JSON.stringify({ dealId: created.id, userId: users[0].id, action: "DEAL_CREATED", previousHash }))
        }
      });
    }
  }

  await Promise.all([
    prisma.appSetting.upsert({
      where: { key: "quickbooksCompany" },
      update: { value: "Demo QuickBooks Company" },
      create: { key: "quickbooksCompany", value: "Demo QuickBooks Company" }
    }),
    prisma.appSetting.upsert({
      where: { key: "quickbooksMode" },
      update: { value: "sandbox" },
      create: { key: "quickbooksMode", value: "sandbox" }
    })
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
