// ============================================================================
// Metafield Configuration
// ============================================================================

export const METAFIELD_NAMESPACE = "logicflow";
export const METAFIELD_KEY = "rules_config";

// ============================================================================
// Field Options
// ============================================================================

export const FIELD_OPTIONS = [
  { label: "Cart Total ($)", value: "cart.total" },
  { label: "Cart Quantity", value: "cart.quantity" },
  { label: "Cart Weight", value: "cart.total_weight" },
  { label: "Shipping Address Line 1", value: "shipping_address.address1" },
  { label: "Shipping Address Line 2", value: "shipping_address.address2" },
  { label: "Shipping City", value: "shipping_address.city" },
  { label: "Shipping Country Code", value: "shipping_address.country_code" },
  { label: "Shipping Province Code", value: "shipping_address.province_code" },
  { label: "Shipping ZIP", value: "shipping_address.zip" },
  { label: "Customer Tags", value: "customer.tags" },
] as const;

// ============================================================================
// Operator Options
// ============================================================================

export const OPERATOR_OPTIONS = [
  { label: "Greater Than", value: "GREATER_THAN" },
  { label: "Less Than", value: "LESS_THAN" },
  { label: "Greater Than or Equal", value: "GREATER_THAN_OR_EQUAL" },
  { label: "Less Than or Equal", value: "LESS_THAN_OR_EQUAL" },
  { label: "Equals", value: "EQUALS" },
  { label: "Not Equals", value: "NOT_EQUALS" },
  { label: "Contains", value: "CONTAINS" },
  { label: "Not Contains", value: "NOT_CONTAINS" },
  { label: "Starts With", value: "STARTS_WITH" },
  { label: "Ends With", value: "ENDS_WITH" },
  { label: "Is PO Box", value: "IS_PO_BOX" },
  { label: "Is Not PO Box", value: "IS_NOT_PO_BOX" },
] as const;

// ============================================================================
// Numeric Operators (for value parsing)
// ============================================================================

export const NUMERIC_OPERATORS = [
  "GREATER_THAN",
  "LESS_THAN",
  "GREATER_THAN_OR_EQUAL",
  "LESS_THAN_OR_EQUAL",
] as const;

// ============================================================================
// Complexity Budget (by tier)
// ============================================================================

export const COMPLEXITY_BUDGET = {
  FREE: 25,
  STARTER: 100,
  PRO: Infinity,
} as const;

export type PlanTier = keyof typeof COMPLEXITY_BUDGET;

// Default tier for MVP (will be dynamic based on subscription in Phase 4)
export const DEFAULT_TIER: PlanTier = "FREE";

