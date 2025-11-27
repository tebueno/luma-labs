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
  const conditions = rule.conditions.criteria.filter(
    (c): c is { field: string; operator: string; value: string | number; is_preset: boolean } =>
      "field" in c
  );

  if (conditions.length === 0) {
    return "No conditions";
  }

  if (conditions.length === 1) {
    const c = conditions[0];
    const fieldLabel = getFieldLabel(c.field);
    const operatorLabel = getOperatorLabel(c.operator).toLowerCase();
    return `If ${fieldLabel} ${operatorLabel} ${c.value}`;
  }

  // Multiple conditions
  const logicalOp = rule.conditions.operator.toLowerCase();
  const conditionSummaries = conditions.slice(0, 2).map((c) => {
    const fieldLabel = getFieldLabel(c.field);
    const operatorLabel = getOperatorLabel(c.operator).toLowerCase();
    return `${fieldLabel} ${operatorLabel} ${c.value}`;
  });

  let summary = conditionSummaries.join(` ${logicalOp} `);
  
  if (conditions.length > 2) {
    summary += ` (+${conditions.length - 2} more)`;
  }

  return `If ${summary}`;
}

// ============================================================================
// Total Complexity
// ============================================================================

export function calculateTotalComplexity(rules: Rule[]): number {
  return rules.reduce((sum, rule) => sum + rule.complexity, 0);
}

