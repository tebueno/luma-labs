// ============================================================================
// Metafield Configuration
// ============================================================================

export const METAFIELD_NAMESPACE = "gatekeep";
export const METAFIELD_KEY = "rules_config";

// ============================================================================
// Field Types - categorize fields for operator filtering
// ============================================================================

export type FieldType = "numeric" | "string" | "address" | "code" | "tags";

export const FIELD_TYPES: Record<string, FieldType> = {
  "cart.total": "numeric",
  "cart.quantity": "numeric",
  "cart.total_weight": "numeric",
  "shipping_address.address1": "address",
  "shipping_address.address2": "address",
  "shipping_address.city": "string",
  "shipping_address.country_code": "code",
  "shipping_address.province_code": "code",
  "shipping_address.zip": "code",
  "customer.tags": "tags",
} as const;

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
// Operator Options - full list
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
// Operators by Field Type - which operators are valid for each field type
// ============================================================================

export const OPERATORS_BY_FIELD_TYPE: Record<FieldType, string[]> = {
  numeric: [
    "GREATER_THAN",
    "LESS_THAN",
    "GREATER_THAN_OR_EQUAL",
    "LESS_THAN_OR_EQUAL",
    "EQUALS",
    "NOT_EQUALS",
  ],
  string: [
    "EQUALS",
    "NOT_EQUALS",
    "CONTAINS",
    "NOT_CONTAINS",
    "STARTS_WITH",
    "ENDS_WITH",
  ],
  address: [
    "EQUALS",
    "NOT_EQUALS",
    "CONTAINS",
    "NOT_CONTAINS",
    "STARTS_WITH",
    "ENDS_WITH",
    "IS_PO_BOX",
    "IS_NOT_PO_BOX",
  ],
  code: ["EQUALS", "NOT_EQUALS", "CONTAINS", "STARTS_WITH"],
  tags: ["EQUALS", "NOT_EQUALS", "CONTAINS"],
} as const;

// ============================================================================
// Default Operators by Field Type - sensible defaults when switching fields
// ============================================================================

export const DEFAULT_OPERATOR_BY_TYPE: Record<FieldType, string> = {
  numeric: "GREATER_THAN",
  string: "CONTAINS",
  address: "CONTAINS",
  code: "EQUALS",
  tags: "EQUALS",
} as const;

// ============================================================================
// Value Placeholders by Field - contextual hints for users
// ============================================================================

export const VALUE_PLACEHOLDERS: Record<string, string> = {
  "cart.total": "100.00",
  "cart.quantity": "5",
  "cart.total_weight": "1000",
  "shipping_address.address1": "123 Main St",
  "shipping_address.address2": "Apt 4B",
  "shipping_address.city": "New York",
  "shipping_address.country_code": "US",
  "shipping_address.province_code": "CA",
  "shipping_address.zip": "94105",
  "customer.tags": "vip",
} as const;

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
// Unary Operators (no value input needed)
// ============================================================================

export const UNARY_OPERATORS = ["IS_PO_BOX", "IS_NOT_PO_BOX"] as const;

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

