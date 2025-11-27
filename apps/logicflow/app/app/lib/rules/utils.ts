import { FIELD_OPTIONS, OPERATOR_OPTIONS, NUMERIC_OPERATORS } from "./constants";
import type { ConditionGroup, Rule } from "./types";

// ============================================================================
// ID Generation
// ============================================================================

export function generateRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Value Parsing
// ============================================================================

export function parseValue(value: string, operator: string): number | string {
  if (NUMERIC_OPERATORS.includes(operator as typeof NUMERIC_OPERATORS[number])) {
    return parseFloat(value) || 0;
  }
  return value;
}

// ============================================================================
// Label Helpers
// ============================================================================

export function getFieldLabel(fieldValue: string): string {
  const option = FIELD_OPTIONS.find((opt) => opt.value === fieldValue);
  return option?.label || fieldValue;
}

export function getOperatorLabel(operatorValue: string): string {
  const option = OPERATOR_OPTIONS.find((opt) => opt.value === operatorValue);
  return option?.label || operatorValue;
}

// ============================================================================
// Complexity Calculation
// ============================================================================

export function calculateComplexity(conditions: ConditionGroup): number {
  let complexity = 0;
  for (const criterion of conditions.criteria) {
    if ("field" in criterion) {
      complexity += 1;
    } else {
      complexity += 1 + calculateComplexity(criterion as ConditionGroup);
    }
  }
  return complexity;
}

// ============================================================================
// Rule Summary
// ============================================================================

export function getRuleSummary(rule: Rule): string {
  const firstCondition = rule.conditions.criteria[0];
  if (!firstCondition || !("field" in firstCondition)) {
    return "Complex condition";
  }

  const fieldLabel = getFieldLabel(firstCondition.field);
  const operatorLabel = getOperatorLabel(firstCondition.operator).toLowerCase();

  return `If ${fieldLabel} ${operatorLabel} ${firstCondition.value}`;
}

// ============================================================================
// Total Complexity
// ============================================================================

export function calculateTotalComplexity(rules: Rule[]): number {
  return rules.reduce((sum, rule) => sum + rule.complexity, 0);
}

