// ============================================================================
// Rule Configuration Types
// ============================================================================

export interface Condition {
  field: string;
  operator: string;
  value: string | number;
  is_preset: boolean;
}

export interface ConditionGroup {
  operator: "AND" | "OR";
  criteria: (Condition | ConditionGroup)[];
}

export interface Rule {
  id: string;
  name: string;
  complexity: number;
  enabled: boolean;
  error_message: string;
  conditions: ConditionGroup;
}

export interface RulesConfig {
  version: string;
  total_complexity: number;
  rules: Rule[];
}

// ============================================================================
// Action Response Types
// ============================================================================

export type ActionType = "create" | "update" | "delete" | "toggle" | "clear";

export interface ActionSuccessResponse {
  success: true;
  action: ActionType;
  config?: RulesConfig;
}

export interface ActionErrorResponse {
  success: false;
  error: string;
}

export type ActionResponse = ActionSuccessResponse | ActionErrorResponse;

// ============================================================================
// Form State Types
// ============================================================================

export interface RuleFormState {
  name: string;
  field: string;
  operator: string;
  value: string;
  errorMessage: string;
  enabled: boolean;
}

export const DEFAULT_FORM_STATE: RuleFormState = {
  name: "",
  field: "cart.total",
  operator: "GREATER_THAN",
  value: "100",
  errorMessage: "Your cart total exceeds our limit.",
  enabled: true,
};

