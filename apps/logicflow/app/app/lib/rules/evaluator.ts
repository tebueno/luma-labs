// ============================================================================
// TypeScript Rule Evaluator (mirrors Rust logic for client-side testing)
// ============================================================================

import type { Rule, Condition, ConditionGroup } from "./types";

// ============================================================================
// Mock Cart Types
// ============================================================================

export interface MockCart {
  total: number;
  quantity: number;
  customerTags: string[];
  shippingAddress: {
    zip: string;
    country: string;
    city: string;
  };
}

export const DEFAULT_MOCK_CART: MockCart = {
  total: 0,
  quantity: 1,
  customerTags: [],
  shippingAddress: {
    zip: "",
    country: "US",
    city: "",
  },
};

// Supported customer tags (must match GraphQL query in run.graphql)
export const SUPPORTED_CUSTOMER_TAGS = [
  "vip",
  "wholesale",
  "blacklist",
  "blocked",
  "fraud",
  "test",
  "staff",
  "b2b",
  "retail",
  "preferred",
] as const;

// ============================================================================
// Test Result Types
// ============================================================================

export interface ConditionResult {
  description: string;
  passed: boolean;
}

export interface RuleTestResult {
  ruleId: string;
  ruleName: string;
  passed: boolean; // true = rule did NOT trigger (checkout allowed)
  blocked: boolean; // true = rule triggered (checkout blocked)
  conditionResults: ConditionResult[];
}

export interface TestResults {
  results: RuleTestResult[];
  rulesEvaluated: number;
  rulesPassed: number;
  rulesBlocked: number;
}

// ============================================================================
// Field Value Extraction
// ============================================================================

type FieldValue = string | number | string[] | undefined;

function getFieldValue(field: string, cart: MockCart): FieldValue {
  switch (field) {
    case "cart.total":
      return cart.total;
    case "cart.quantity":
      return cart.quantity;
    case "customer.tags":
      return cart.customerTags;
    case "shipping_address.zip":
      return cart.shippingAddress.zip;
    case "shipping_address.country":
      return cart.shippingAddress.country;
    case "shipping_address.city":
      return cart.shippingAddress.city;
    default:
      return undefined;
  }
}

function getFieldLabel(field: string): string {
  switch (field) {
    case "cart.total":
      return "Cart Total";
    case "cart.quantity":
      return "Cart Quantity";
    case "customer.tags":
      return "Customer Tags";
    case "shipping_address.zip":
      return "ZIP Code";
    case "shipping_address.country":
      return "Country";
    case "shipping_address.city":
      return "City";
    default:
      return field;
  }
}

function getOperatorLabel(operator: string): string {
  switch (operator) {
    case "GREATER_THAN":
      return ">";
    case "LESS_THAN":
      return "<";
    case "GREATER_THAN_OR_EQUAL":
      return "≥";
    case "LESS_THAN_OR_EQUAL":
      return "≤";
    case "EQUALS":
      return "=";
    case "NOT_EQUALS":
      return "≠";
    case "CONTAINS":
      return "contains";
    case "NOT_CONTAINS":
      return "doesn't contain";
    case "STARTS_WITH":
      return "starts with";
    case "ENDS_WITH":
      return "ends with";
    default:
      return operator;
  }
}

// ============================================================================
// Condition Evaluation
// ============================================================================

function evaluateCondition(
  condition: Condition,
  cart: MockCart
): { passed: boolean; description: string } {
  const fieldValue = getFieldValue(condition.field, cart);
  const targetValue = condition.value;
  const fieldLabel = getFieldLabel(condition.field);
  const opLabel = getOperatorLabel(condition.operator);

  // Build description
  const description = `${fieldLabel} ${opLabel} ${targetValue}`;

  // Handle undefined field
  if (fieldValue === undefined) {
    return { passed: false, description: `${description} (field not found)` };
  }

  let conditionMet = false;

  // Array comparisons (e.g., customer.tags)
  if (Array.isArray(fieldValue)) {
    const strTarget = String(targetValue).toLowerCase();

    switch (condition.operator) {
      case "CONTAINS":
        // Check if array contains the target value (case-insensitive)
        conditionMet = fieldValue.some(
          (item) => item.toLowerCase() === strTarget
        );
        break;
      case "NOT_CONTAINS":
        conditionMet = !fieldValue.some(
          (item) => item.toLowerCase() === strTarget
        );
        break;
      case "EQUALS":
        // For arrays, EQUALS checks if the tag exists
        conditionMet = fieldValue.some(
          (item) => item.toLowerCase() === strTarget
        );
        break;
      case "NOT_EQUALS":
        conditionMet = !fieldValue.some(
          (item) => item.toLowerCase() === strTarget
        );
        break;
    }

    return { passed: conditionMet, description };
  }

  // Numeric comparisons
  if (typeof fieldValue === "number" || !isNaN(Number(fieldValue))) {
    const numField =
      typeof fieldValue === "number" ? fieldValue : Number(fieldValue);
    const numTarget =
      typeof targetValue === "number" ? targetValue : Number(targetValue);

    switch (condition.operator) {
      case "GREATER_THAN":
        conditionMet = numField > numTarget;
        break;
      case "LESS_THAN":
        conditionMet = numField < numTarget;
        break;
      case "GREATER_THAN_OR_EQUAL":
        conditionMet = numField >= numTarget;
        break;
      case "LESS_THAN_OR_EQUAL":
        conditionMet = numField <= numTarget;
        break;
      case "EQUALS":
        conditionMet = numField === numTarget;
        break;
      case "NOT_EQUALS":
        conditionMet = numField !== numTarget;
        break;
    }
  }

  // String comparisons
  if (typeof fieldValue === "string") {
    const strField = fieldValue.toLowerCase();
    const strTarget = String(targetValue).toLowerCase();

    switch (condition.operator) {
      case "EQUALS":
        conditionMet = strField === strTarget;
        break;
      case "NOT_EQUALS":
        conditionMet = strField !== strTarget;
        break;
      case "CONTAINS":
        conditionMet = strField.includes(strTarget);
        break;
      case "NOT_CONTAINS":
        conditionMet = !strField.includes(strTarget);
        break;
      case "STARTS_WITH":
        conditionMet = strField.startsWith(strTarget);
        break;
      case "ENDS_WITH":
        conditionMet = strField.endsWith(strTarget);
        break;
    }
  }

  return { passed: conditionMet, description };
}

// Type guard for Condition vs ConditionGroup
function isCondition(
  criterion: Condition | ConditionGroup
): criterion is Condition {
  return "field" in criterion && "operator" in criterion && "value" in criterion;
}

// ============================================================================
// Group Evaluation (AND/OR logic)
// ============================================================================

function evaluateGroup(
  group: ConditionGroup,
  cart: MockCart
): { passed: boolean; conditionResults: ConditionResult[] } {
  const conditionResults: ConditionResult[] = [];
  const criteriaResults: boolean[] = [];

  for (const criterion of group.criteria) {
    if (isCondition(criterion)) {
      const result = evaluateCondition(criterion, cart);
      conditionResults.push({
        description: result.description,
        passed: result.passed,
      });
      criteriaResults.push(result.passed);
    } else {
      // Nested group - evaluate recursively
      const nestedResult = evaluateGroup(criterion, cart);
      conditionResults.push(...nestedResult.conditionResults);
      criteriaResults.push(nestedResult.passed);
    }
  }

  // Apply AND/OR logic
  const groupPassed =
    group.operator === "AND"
      ? criteriaResults.every((r) => r)
      : criteriaResults.some((r) => r);

  return { passed: groupPassed, conditionResults };
}

// ============================================================================
// Rule Evaluation
// ============================================================================

function evaluateRule(rule: Rule, cart: MockCart): RuleTestResult {
  const { passed, conditionResults } = evaluateGroup(rule.conditions, cart);

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    passed: !passed, // Rule "passes" (allows checkout) if conditions are NOT met
    blocked: passed, // Rule "blocks" if conditions ARE met
    conditionResults,
  };
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

export function evaluateRules(rules: Rule[], cart: MockCart): TestResults {
  const enabledRules = rules.filter((r) => r.enabled);
  const results: RuleTestResult[] = [];

  for (const rule of enabledRules) {
    results.push(evaluateRule(rule, cart));
  }

  const rulesPassed = results.filter((r) => r.passed).length;
  const rulesBlocked = results.filter((r) => r.blocked).length;

  return {
    results,
    rulesEvaluated: enabledRules.length,
    rulesPassed,
    rulesBlocked,
  };
}

