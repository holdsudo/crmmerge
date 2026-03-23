import Link from "next/link";
import { importSpreadsheetAction } from "@/app/actions";
import { CsvImportForm } from "@/components/forms";
import { prisma } from "@/lib/db";
import { requireAdminOrManager } from "@/lib/auth";
import { formatCurrency, formatPercent } from "@/lib/format";

export default async function ReportsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAdminOrManager();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const [vendors, deals] = await Promise.all([
    prisma.vendor.findMany({ include: { deals: true }, orderBy: { name: "asc" } }),
    prisma.deal.findMany({ include: { vendor: true }, orderBy: { dealDate: "desc" } })
  ]);

  const profitByVendor = vendors.map((vendor) => ({
    name: vendor.name,
    deals: vendor.deals.length,
    amountOwed: vendor.deals.reduce((sum, deal) => sum + deal.amountOwedToVendor, 0),
    yourProfit: vendor.deals.reduce((sum, deal) => sum + deal.yourProfit, 0),
    averageApr: vendor.deals.length ? vendor.deals.reduce((sum, deal) => sum + deal.interestRate, 0) / vendor.deals.length : 0
  }));

  const profitByMonth = Object.values(
    deals.reduce<Record<string, { month: string; deals: number; amountOwed: number; yourProfit: number }>>((acc, deal) => {
      const month = new Date(deal.dealDate).toLocaleString("en-US", { month: "short", year: "numeric" });
      if (!acc[month]) {
        acc[month] = { month, deals: 0, amountOwed: 0, yourProfit: 0 };
      }
      acc[month].deals += 1;
      acc[month].amountOwed += deal.amountOwedToVendor;
      acc[month].yourProfit += deal.yourProfit;
      return acc;
    }, {})
  );

  const amountOwedByCarType = Object.values(
    deals.reduce<Record<string, { carType: string; amount: number }>>((acc, deal) => {
      if (!acc[deal.carType]) {
        acc[deal.carType] = { carType: deal.carType, amount: 0 };
      }
      acc[deal.carType].amount += deal.amountOwedToVendor;
      return acc;
    }, {})
  );

  const importMessage =
    typeof resolvedSearchParams?.import === "string"
      ? `Imported ${resolvedSearchParams.import}: ${resolvedSearchParams.created ?? "0"} created, ${resolvedSearchParams.updated ?? "0"} updated.`
      : null;
  const canImport = ["ADMIN", "MANAGER"].includes(user.role);

  return (
    <div className="stack">
      <div className="row-between">
        <p className="subtitle">View profit trends and move CRM data in and out with finance-friendly spreadsheet exports.</p>
        <div className="row">
          <Link className="button-secondary" href="/api/reports/vendors.csv">
            Export vendors
          </Link>
          <Link className="button-secondary" href="/api/reports/deals.csv">
            Export deals
          </Link>
          <Link className="button" href="/api/reports/monthly.csv">
            Monthly CSV
          </Link>
        </div>
      </div>

      {importMessage ? <div className="panel helper">{importMessage}</div> : null}

      <section className="grid cards-2">
        <div className="panel">
          <span className="kicker">Vendor rollup</span>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Deals</th>
                  <th>Amount owed</th>
                  <th>Your profit</th>
                  <th>Average APR</th>
                </tr>
              </thead>
              <tbody>
                {profitByVendor.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.deals}</td>
                    <td>{formatCurrency(row.amountOwed)}</td>
                    <td>{formatCurrency(row.yourProfit)}</td>
                    <td>{formatPercent(row.averageApr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <span className="kicker">Monthly performance</span>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Deals</th>
                  <th>Amount owed</th>
                  <th>Your profit</th>
                </tr>
              </thead>
              <tbody>
                {profitByMonth.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td>{row.deals}</td>
                    <td>{formatCurrency(row.amountOwed)}</td>
                    <td>{formatCurrency(row.yourProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="panel">
        <span className="kicker">Amount owed by vehicle type</span>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vehicle type</th>
                <th>Total amount owed</th>
              </tr>
            </thead>
            <tbody>
              {amountOwedByCarType.map((row) => (
                <tr key={row.carType}>
                  <td>{row.carType}</td>
                  <td>{formatCurrency(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid cards-2">
        <div className="panel stack">
          <div>
            <span className="kicker">Data exchange</span>
            <h2 style={{ marginTop: 0 }}>Smart import and export</h2>
          </div>
          <div className="helper">
            Upload one CSV or Excel file. The CRM scrubs the headers, decides whether it is vendor data or deal data, and maps the rows into the correct fields.
          </div>
          <div className="stack">
            <div className="card">
              <strong>Vendor sheet examples</strong>
              <div className="helper">Name, Contact Name, Email, Phone, Active</div>
            </div>
            <div className="card">
              <strong>Deal sheet examples</strong>
              <div className="helper">Deal ID optional, plus Vendor, Customer, Date, Amount Owed To Vendor, Vehicle Type, Year, Make, Model, Interest Rate, Your Profit, F&amp;I Products, Status, Lender Name, Notes, QuickBooks Status, QuickBooks External ID</div>
            </div>
          </div>
        </div>

        <div className="stack">
          {canImport ? (
            <CsvImportForm
              action={importSpreadsheetAction}
              title="Smart spreadsheet import"
              description="Upload a CSV or Excel sheet and the CRM will classify it as vendors or deals based on the headers."
              fieldName="importFile"
            />
          ) : (
            <div className="panel helper">Only Admin and Manager users can run spreadsheet imports.</div>
          )}
        </div>
      </section>
    </div>
  );
}
