"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Deal, DealStatus, QbSyncStatus, Vendor } from "@prisma/client";
import { settingEnabled, type AppSettingsMap } from "@/lib/app-settings";
import { CAR_TYPE_OPTIONS, DEAL_STATUS_OPTIONS, FI_PRODUCT_OPTIONS, QB_SYNC_OPTIONS } from "@/lib/constants";

type CustomerOption = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  coBuyerName?: string | null;
};

type UserOption = {
  id: string;
  name: string;
  role: string;
};

type DealFormClientProps = {
  action: (formData: FormData) => void | Promise<void>;
  vendors: Vendor[];
  customers: CustomerOption[];
  users: UserOption[];
  deal?: Partial<Deal>;
  readOnly?: boolean;
  defaultVendorId?: string;
  settings: AppSettingsMap;
};

function SummaryCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="selection-summary">
      <span className="kicker">{title}</span>
      <div className="stack">
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}

export function DealFormClient({
  action,
  vendors,
  customers,
  users,
  deal,
  readOnly,
  defaultVendorId,
  settings
}: DealFormClientProps) {
  const [selectedVendorId, setSelectedVendorId] = useState(deal?.vendorId ?? defaultVendorId ?? "__new__");
  const [selectedCustomerId, setSelectedCustomerId] = useState(deal?.customerId ?? "__new__");
  const selectedFiProducts = new Set((deal?.fiProducts ?? "").split(",").filter(Boolean));
  const showQuickbooksFields = settingEnabled(settings.showQuickbooksFields);
  const requireBuyerEmail = settingEnabled(settings.requireBuyerEmail);
  const notesOpen = settingEnabled(settings.notesPanelOpenByDefault);

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedVendorId),
    [selectedVendorId, vendors]
  );
  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId),
    [selectedCustomerId, customers]
  );

  const usingExistingVendor = Boolean(selectedVendor && selectedVendorId !== "__new__");
  const usingExistingCustomer = Boolean(selectedCustomer && selectedCustomerId !== "__new__");
  const buyerSummary = selectedCustomer
    ? [selectedCustomer.name, selectedCustomer.phone || "No phone", selectedCustomer.email || "No email", selectedCustomer.coBuyerName || "No co-buyer"]
    : [deal?.customerName || "No customer selected"];
  const vendorSummary = selectedVendor
    ? [selectedVendor.name, selectedVendor.contactName || "No contact", selectedVendor.email || "No email", selectedVendor.phone || "No phone"]
    : ["Create a vendor from the fields below"];

  return (
    <form action={action} className="panel stack">
      <details className="accordion-panel" open>
        <summary>
          {settings.dealVendorSectionLabel}
          <span className="summary-meta">{selectedVendor?.name ?? "Select vendor or add new"}</span>
        </summary>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="vendorId">Vendor</label>
            <select
              id="vendorId"
              name="vendorId"
              value={selectedVendorId}
              onChange={(event) => setSelectedVendorId(event.target.value)}
              required
              disabled={readOnly}
            >
              <option value="">Select a vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
              <option value="__new__">Add new vendor below</option>
            </select>
          </div>
          {usingExistingVendor ? (
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <SummaryCard title="Selected vendor" lines={vendorSummary} />
            </div>
          ) : (
            <>
              <div className="field">
                <label htmlFor="newVendorName">New vendor name</label>
                <input id="newVendorName" name="newVendorName" placeholder="Only used if Add new vendor is selected" disabled={readOnly} />
              </div>
              <div className="field">
                <label htmlFor="newVendorContactName">Vendor contact</label>
                <input id="newVendorContactName" name="newVendorContactName" disabled={readOnly} />
              </div>
              <div className="field">
                <label htmlFor="newVendorEmail">Vendor email</label>
                <input id="newVendorEmail" name="newVendorEmail" type="email" disabled={readOnly} />
              </div>
              <div className="field">
                <label htmlFor="newVendorPhone">Vendor phone</label>
                <input id="newVendorPhone" name="newVendorPhone" disabled={readOnly} />
              </div>
            </>
          )}
          <div className="field">
            <label htmlFor="dealDate">Deal date</label>
            <input
              id="dealDate"
              name="dealDate"
              type="date"
              defaultValue={deal?.dealDate ? new Date(deal.dealDate).toISOString().slice(0, 10) : ""}
              required
              disabled={readOnly}
            />
          </div>
        </div>
      </details>

      <details className="accordion-panel" open>
        <summary>
          {settings.dealBuyerSectionLabel}
          <span className="summary-meta">{selectedCustomer?.name ?? deal?.customerName ?? "Customer, phone, email, co-buyer"}</span>
        </summary>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="customerId">Existing customer</label>
            <select
              id="customerId"
              name="customerId"
              value={selectedCustomerId}
              onChange={(event) => setSelectedCustomerId(event.target.value)}
              disabled={readOnly}
            >
              <option value="__new__">Create from buyer info below</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          {usingExistingCustomer ? (
            <>
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <SummaryCard title="Selected customer" lines={buyerSummary} />
              </div>
              <input type="hidden" name="customerName" value={selectedCustomer?.name ?? ""} />
              <input type="hidden" name="buyerPhone" value={selectedCustomer?.phone ?? ""} />
              <input type="hidden" name="buyerEmail" value={selectedCustomer?.email ?? ""} />
              <input type="hidden" name="coBuyerName" value={selectedCustomer?.coBuyerName ?? ""} />
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="customerName">Customer name</label>
                <input id="customerName" name="customerName" defaultValue={deal?.customerName} required disabled={readOnly} />
              </div>
              <div className="field">
                <label htmlFor="buyerPhone">Buyer phone</label>
                <input id="buyerPhone" name="buyerPhone" defaultValue={deal?.buyerPhone ?? ""} disabled={readOnly} />
              </div>
              <div className="field">
                <label htmlFor="buyerEmail">Buyer email</label>
                <input id="buyerEmail" name="buyerEmail" type="email" defaultValue={deal?.buyerEmail ?? ""} required={requireBuyerEmail} disabled={readOnly} />
              </div>
              <div className="field">
                <label htmlFor="coBuyerName">Co-buyer</label>
                <input id="coBuyerName" name="coBuyerName" defaultValue={deal?.coBuyerName ?? ""} disabled={readOnly} />
              </div>
            </>
          )}
        </div>
      </details>

      <details className="accordion-panel" open>
        <summary>
          {settings.dealFinancialSectionLabel}
          <span className="summary-meta">Amount owed, down payment, profit, APR</span>
        </summary>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="amountOwedToVendor">Amount owed to vendor</label>
            <input id="amountOwedToVendor" name="amountOwedToVendor" type="number" step="0.01" defaultValue={deal?.amountOwedToVendor ?? ""} required disabled={readOnly} />
          </div>
          <div className="field">
            <label htmlFor="downPayment">Down payment</label>
            <input id="downPayment" name="downPayment" type="number" step="0.01" defaultValue={deal?.downPayment ?? ""} disabled={readOnly} />
          </div>
          <div className="field">
            <label htmlFor="termMonths">Term (months)</label>
            <input id="termMonths" name="termMonths" type="number" min="1" defaultValue={deal?.termMonths ?? ""} disabled={readOnly} />
          </div>
          <div className="field">
            <label htmlFor="interestAmount">Interest paid</label>
            <input id="interestAmount" name="interestAmount" type="number" step="0.01" defaultValue={deal?.interestAmount ?? ""} disabled={readOnly} />
          </div>
          <div className="field">
            <label htmlFor="yourProfit">Your profit</label>
            <input id="yourProfit" name="yourProfit" type="number" step="0.01" defaultValue={deal?.yourProfit ?? ""} required disabled={readOnly} />
          </div>
          <div className="field">
            <label htmlFor="interestRate">Interest rate</label>
            <input id="interestRate" name="interestRate" type="number" step="0.01" defaultValue={deal?.interestRate ?? ""} required disabled={readOnly} />
          </div>
        </div>
      </details>

      <details className="accordion-panel">
        <summary>
          Contracts &amp; attachments
          <span className="summary-meta">Upload signed PDF contracts</span>
        </summary>
        <div className="field">
          <label htmlFor="contractFile">Upload contract (PDF)</label>
          <input
            id="contractFile"
            name="contractFile"
            type="file"
            accept="application/pdf"
            disabled={readOnly}
          />
        </div>
        <div className="helper">
          {deal?.contractFileName && deal.contractFilePath ? (
            <Link href={`/api/contracts/${deal.contractFilePath}`}>{deal.contractFileName}</Link>
          ) : (
            "No contract uploaded yet."
          )}
        </div>
      </details>

      <details className="accordion-panel">
        <summary>
          {settings.dealVehicleSectionLabel}
          <span className="summary-meta">{[deal?.vehicleYear, deal?.vehicleMake, deal?.vehicleModel || deal?.carType].filter(Boolean).join(" ") || "Vehicle type, year, make, model"}</span>
        </summary>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="carType">Vehicle type</label>
            <select id="carType" name="carType" defaultValue={deal?.carType} required disabled={readOnly}>
              <option value="">Select</option>
              {CAR_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="vehicleYear">Year</label>
            <input id="vehicleYear" name="vehicleYear" type="number" min="1980" max="2099" defaultValue={deal?.vehicleYear ?? ""} disabled={readOnly} />
          </div>
          <div className="field">
            <label htmlFor="vehicleMake">Make</label>
            <input id="vehicleMake" name="vehicleMake" defaultValue={deal?.vehicleMake ?? ""} disabled={readOnly} />
          </div>
          <div className="field">
            <label htmlFor="vehicleModel">Model</label>
            <input id="vehicleModel" name="vehicleModel" defaultValue={deal?.vehicleModel ?? ""} disabled={readOnly} />
          </div>
        </div>
      </details>

      <details className="accordion-panel">
        <summary>
          {settings.dealFiSectionLabel}
          <span className="summary-meta">{selectedFiProducts.size ? `${selectedFiProducts.size} selected` : "Select coverage products"}</span>
        </summary>
        <div className="checkbox-grid">
          {FI_PRODUCT_OPTIONS.map((option) => (
            <label key={option.value} className={`checkbox-card ${readOnly ? "is-disabled" : ""}`}>
              <input
                type="checkbox"
                name="fiProducts"
                value={option.value}
                defaultChecked={selectedFiProducts.has(option.value)}
                disabled={readOnly}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </details>

      <details className="accordion-panel">
        <summary>
          {settings.dealAccountingSectionLabel}
          <span className="summary-meta">Assigned staff, status, lender, sync</span>
        </summary>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={deal?.status ?? DealStatus.NEW} disabled={readOnly}>
              {DEAL_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="assignedStaffId">Assigned staff</label>
            <select id="assignedStaffId" name="assignedStaffId" defaultValue={deal?.assignedStaffId ?? ""} disabled={readOnly}>
              <option value="">Select a staff member</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lenderName">Lender name</label>
            <input id="lenderName" name="lenderName" defaultValue={deal?.lenderName ?? ""} disabled={readOnly} />
          </div>
          <div className="field">
            <label htmlFor="qbSyncStatus">QuickBooks sync status</label>
            <select id="qbSyncStatus" name="qbSyncStatus" defaultValue={deal?.qbSyncStatus ?? QbSyncStatus.NOT_SYNCED} disabled={readOnly || !showQuickbooksFields}>
              {QB_SYNC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {!showQuickbooksFields ? <input type="hidden" name="qbSyncStatus" value={deal?.qbSyncStatus ?? QbSyncStatus.NOT_SYNCED} /> : null}
          {showQuickbooksFields ? (
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="qbExternalId">QuickBooks external ID</label>
              <input id="qbExternalId" name="qbExternalId" defaultValue={deal?.qbExternalId ?? ""} disabled={readOnly} />
            </div>
          ) : (
            <input type="hidden" name="qbExternalId" value={deal?.qbExternalId ?? ""} />
          )}
        </div>
      </details>

      <details className="accordion-panel" open={notesOpen}>
        <summary>
          {settings.dealNotesSectionLabel}
          <span className="summary-meta">{deal?.notes ? "Notes added" : "Add internal notes"}</span>
        </summary>
        <div className="field">
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" defaultValue={deal?.notes ?? ""} disabled={readOnly} />
        </div>
      </details>

      <div className="row">
        {!readOnly ? (
          <button className="button" type="submit">
            {deal ? "Save deal" : "Create deal"}
          </button>
        ) : null}
        <Link className="button-secondary" href={deal ? `/deals/${deal.id}` : "/deals"}>
          {readOnly ? "Back" : "Cancel"}
        </Link>
      </div>
    </form>
  );
}
