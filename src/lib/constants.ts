export const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "STAFF", label: "Staff" }
] as const;

export const DEAL_STATUS_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "FUNDED", label: "Funded" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" }
] as const;

export const QB_SYNC_OPTIONS = [
  { value: "NOT_SYNCED", label: "Not Synced" },
  { value: "PENDING", label: "Pending" },
  { value: "SYNCED", label: "Synced" },
  { value: "FAILED", label: "Failed" }
] as const;

export const CAR_TYPE_OPTIONS = ["Sedan", "SUV", "Truck", "Coupe", "Van", "Other"] as const;

export const FI_PRODUCT_OPTIONS = [
  { value: "GAP", label: "GAP insurance" },
  { value: "VSC", label: "Vehicle service contract" },
  { value: "TIRE_WHEEL", label: "Tire and wheel" },
  { value: "KEY_REPLACEMENT", label: "Key replacement" },
  { value: "WINDSHIELD", label: "Windshield protection" },
  { value: "DENT_DING", label: "Dent and ding" },
  { value: "APPEARANCE", label: "Appearance protection" },
  { value: "WEAR_TEAR", label: "Wear and tear" },
  { value: "THEFT", label: "Theft protection" },
  { value: "MAINTENANCE", label: "Maintenance plan" },
  { value: "ROAD_HAZARD", label: "Road hazard" }
] as const;
