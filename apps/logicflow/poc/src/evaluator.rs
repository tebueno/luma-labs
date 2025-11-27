//! Rule evaluation engine.
//!
//! This module contains the core logic for evaluating rules against cart data.
//! It is designed for maximum performance within Shopify Functions' 5ms budget.

use crate::models::{
    CartInput, ComparisonOperator, Condition, ConditionGroup, Criterion, FieldValue,
    LogicalOperator, Rule, RulesConfig,
};
use crate::patterns::get_preset_pattern;
use regex::Regex;

/// Result of evaluating rules against a cart.
#[derive(Debug, Clone)]
pub struct EvaluationResult {
    pub errors: Vec<ValidationError>,
    pub rules_evaluated: usize,
    pub execution_time_us: u128,
}

/// A validation error to return to checkout.
#[derive(Debug, Clone)]
pub struct ValidationError {
    pub rule_id: String,
    pub message: String,
}

/// Runtime configuration for guardrails.
#[derive(Debug, Clone)]
pub struct EvaluatorConfig {
    pub max_rules: usize,
    pub max_regex_rules: usize,
    pub time_budget_ms: u128,
}

impl Default for EvaluatorConfig {
    fn default() -> Self {
        Self {
            max_rules: 100,
            max_regex_rules: 30,
            time_budget_ms: 4,
        }
    }
}

/// Evaluate all rules against the cart and return validation errors.
pub fn evaluate_rules(config: &RulesConfig, cart: &CartInput) -> EvaluationResult {
    evaluate_rules_with_config(config, cart, &EvaluatorConfig::default())
}

/// Evaluate rules with custom guardrail configuration.
pub fn evaluate_rules_with_config(
    config: &RulesConfig,
    cart: &CartInput,
    eval_config: &EvaluatorConfig,
) -> EvaluationResult {
    let start = std::time::Instant::now();
    let mut errors = Vec::new();
    let mut rules_evaluated = 0;
    let mut regex_count = 0;

    for rule in &config.rules {
        // Guardrail 1: Max rules
        if rules_evaluated >= eval_config.max_rules {
            #[cfg(debug_assertions)]
            eprintln!("Warning: Rule limit reached at {}", rules_evaluated);
            break;
        }

        // Skip disabled rules
        if !rule.enabled {
            continue;
        }

        // Guardrail 2: Max regex rules
        if rule_uses_regex(&rule.conditions) {
            regex_count += 1;
            if regex_count > eval_config.max_regex_rules {
                #[cfg(debug_assertions)]
                eprintln!("Warning: Regex rule limit reached");
                continue;
            }
        }

        // Guardrail 3: Time budget
        if start.elapsed().as_millis() > eval_config.time_budget_ms {
            #[cfg(debug_assertions)]
            eprintln!(
                "Warning: Time budget exceeded at rule {}",
                rules_evaluated
            );
            break;
        }

        // Evaluate the rule
        if evaluate_rule(rule, cart) {
            errors.push(ValidationError {
                rule_id: rule.id.clone(),
                message: rule.error_message.clone(),
            });
        }

        rules_evaluated += 1;
    }

    EvaluationResult {
        errors,
        rules_evaluated,
        execution_time_us: start.elapsed().as_micros(),
    }
}

/// Check if a condition group uses any regex operators.
fn rule_uses_regex(group: &ConditionGroup) -> bool {
    group.criteria.iter().any(|criterion| match criterion {
        Criterion::Condition(c) => c.operator == ComparisonOperator::RegexMatch,
        Criterion::Group(g) => rule_uses_regex(g),
    })
}

/// Evaluate a single rule against the cart.
fn evaluate_rule(rule: &Rule, cart: &CartInput) -> bool {
    evaluate_group(&rule.conditions, cart)
}

/// Evaluate a condition group (AND/OR logic).
fn evaluate_group(group: &ConditionGroup, cart: &CartInput) -> bool {
    match group.operator {
        LogicalOperator::And => group
            .criteria
            .iter()
            .all(|criterion| evaluate_criterion(criterion, cart)),
        LogicalOperator::Or => group
            .criteria
            .iter()
            .any(|criterion| evaluate_criterion(criterion, cart)),
    }
}

/// Evaluate a single criterion (either a condition or nested group).
fn evaluate_criterion(criterion: &Criterion, cart: &CartInput) -> bool {
    match criterion {
        Criterion::Condition(condition) => evaluate_condition(condition, cart),
        Criterion::Group(group) => evaluate_group(group, cart),
    }
}

/// Evaluate a single condition against the cart.
fn evaluate_condition(condition: &Condition, cart: &CartInput) -> bool {
    let field_value = match cart.get_field(&condition.field) {
        Some(v) => v,
        None => return false, // Field not found, condition doesn't match
    };

    compare(&field_value, &condition.operator, &condition.value, condition.is_preset)
}

/// Compare a field value against a condition value using the specified operator.
fn compare(
    field_value: &FieldValue,
    operator: &ComparisonOperator,
    condition_value: &serde_json::Value,
    is_preset: bool,
) -> bool {
    match operator {
        ComparisonOperator::Equals => compare_equals(field_value, condition_value),
        ComparisonOperator::NotEquals => !compare_equals(field_value, condition_value),
        ComparisonOperator::GreaterThan => compare_numeric(field_value, condition_value, |a, b| a > b),
        ComparisonOperator::GreaterThanOrEqual => compare_numeric(field_value, condition_value, |a, b| a >= b),
        ComparisonOperator::LessThan => compare_numeric(field_value, condition_value, |a, b| a < b),
        ComparisonOperator::LessThanOrEqual => compare_numeric(field_value, condition_value, |a, b| a <= b),
        ComparisonOperator::Contains => compare_contains(field_value, condition_value),
        ComparisonOperator::NotContains => !compare_contains(field_value, condition_value),
        ComparisonOperator::StartsWith => compare_starts_with(field_value, condition_value),
        ComparisonOperator::EndsWith => compare_ends_with(field_value, condition_value),
        ComparisonOperator::RegexMatch => compare_regex(field_value, condition_value, is_preset),
        ComparisonOperator::In => compare_in(field_value, condition_value),
        ComparisonOperator::NotIn => !compare_in(field_value, condition_value),
    }
}

fn compare_equals(field_value: &FieldValue, condition_value: &serde_json::Value) -> bool {
    match (field_value, condition_value) {
        (FieldValue::String(s), serde_json::Value::String(cv)) => s == cv,
        (FieldValue::Number(n), serde_json::Value::Number(cv)) => {
            cv.as_f64().map_or(false, |cv| (*n - cv).abs() < f64::EPSILON)
        }
        (FieldValue::Bool(b), serde_json::Value::Bool(cv)) => b == cv,
        _ => false,
    }
}

fn compare_numeric<F>(field_value: &FieldValue, condition_value: &serde_json::Value, cmp: F) -> bool
where
    F: Fn(f64, f64) -> bool,
{
    match field_value {
        FieldValue::Number(n) => condition_value
            .as_f64()
            .map_or(false, |cv| cmp(*n, cv)),
        _ => false,
    }
}

fn compare_contains(field_value: &FieldValue, condition_value: &serde_json::Value) -> bool {
    match (field_value, condition_value) {
        (FieldValue::String(s), serde_json::Value::String(cv)) => {
            s.to_lowercase().contains(&cv.to_lowercase())
        }
        (FieldValue::StringArray(arr), serde_json::Value::String(cv)) => {
            arr.iter().any(|s| s.to_lowercase() == cv.to_lowercase())
        }
        _ => false,
    }
}

fn compare_starts_with(field_value: &FieldValue, condition_value: &serde_json::Value) -> bool {
    match (field_value, condition_value) {
        (FieldValue::String(s), serde_json::Value::String(cv)) => {
            s.to_lowercase().starts_with(&cv.to_lowercase())
        }
        _ => false,
    }
}

fn compare_ends_with(field_value: &FieldValue, condition_value: &serde_json::Value) -> bool {
    match (field_value, condition_value) {
        (FieldValue::String(s), serde_json::Value::String(cv)) => {
            s.to_lowercase().ends_with(&cv.to_lowercase())
        }
        _ => false,
    }
}

fn compare_regex(field_value: &FieldValue, condition_value: &serde_json::Value, is_preset: bool) -> bool {
    let pattern_str = match condition_value.as_str() {
        Some(s) => s,
        None => return false,
    };

    let field_str = match field_value {
        FieldValue::String(s) => s,
        _ => return false,
    };

    // Use preset pattern if available
    if is_preset {
        if let Some(preset) = get_preset_pattern(pattern_str) {
            return preset.is_match(field_str);
        }
    }

    // Fall back to compiling the pattern (slower, but allows custom regex)
    // In production, custom patterns would be pre-validated at save time
    match Regex::new(pattern_str) {
        Ok(re) => re.is_match(field_str),
        Err(_) => false,
    }
}

fn compare_in(field_value: &FieldValue, condition_value: &serde_json::Value) -> bool {
    match condition_value {
        serde_json::Value::Array(arr) => match field_value {
            FieldValue::String(s) => arr.iter().any(|v| {
                v.as_str().map_or(false, |vs| vs.to_lowercase() == s.to_lowercase())
            }),
            FieldValue::Number(n) => arr.iter().any(|v| {
                v.as_f64().map_or(false, |vn| (*n - vn).abs() < f64::EPSILON)
            }),
            _ => false,
        },
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::Address;

    fn make_simple_rule(field: &str, op: ComparisonOperator, value: serde_json::Value) -> Rule {
        Rule {
            id: "test".to_string(),
            name: "Test Rule".to_string(),
            complexity: 1,
            enabled: true,
            error_message: "Blocked".to_string(),
            conditions: ConditionGroup {
                operator: LogicalOperator::And,
                criteria: vec![Criterion::Condition(Condition {
                    field: field.to_string(),
                    operator: op,
                    value,
                    is_preset: false,
                })],
            },
        }
    }

    #[test]
    fn test_numeric_greater_than() {
        let cart = CartInput {
            total: 150.0,
            ..Default::default()
        };

        let rule = make_simple_rule(
            "cart.total",
            ComparisonOperator::GreaterThan,
            serde_json::json!(100.0),
        );

        assert!(evaluate_rule(&rule, &cart));
    }

    #[test]
    fn test_numeric_greater_than_no_match() {
        let cart = CartInput {
            total: 50.0,
            ..Default::default()
        };

        let rule = make_simple_rule(
            "cart.total",
            ComparisonOperator::GreaterThan,
            serde_json::json!(100.0),
        );

        assert!(!evaluate_rule(&rule, &cart));
    }

    #[test]
    fn test_string_contains() {
        let cart = CartInput {
            shipping_address: Address {
                address1: "PO Box 123".to_string(),
                ..Default::default()
            },
            ..Default::default()
        };

        let rule = make_simple_rule(
            "shipping_address.address1",
            ComparisonOperator::Contains,
            serde_json::json!("box"),
        );

        assert!(evaluate_rule(&rule, &cart));
    }

    #[test]
    fn test_customer_tags_contains() {
        let cart = CartInput {
            customer_tags: vec!["VIP".to_string(), "Wholesale".to_string()],
            ..Default::default()
        };

        let rule = make_simple_rule(
            "customer.tags",
            ComparisonOperator::Contains,
            serde_json::json!("vip"),
        );

        assert!(evaluate_rule(&rule, &cart));
    }

    #[test]
    fn test_and_logic() {
        let cart = CartInput {
            total: 150.0,
            shipping_address: Address {
                country_code: "US".to_string(),
                ..Default::default()
            },
            ..Default::default()
        };

        let rule = Rule {
            id: "test".to_string(),
            name: "Test Rule".to_string(),
            complexity: 2,
            enabled: true,
            error_message: "Blocked".to_string(),
            conditions: ConditionGroup {
                operator: LogicalOperator::And,
                criteria: vec![
                    Criterion::Condition(Condition {
                        field: "cart.total".to_string(),
                        operator: ComparisonOperator::GreaterThan,
                        value: serde_json::json!(100.0),
                        is_preset: false,
                    }),
                    Criterion::Condition(Condition {
                        field: "shipping_address.country_code".to_string(),
                        operator: ComparisonOperator::Equals,
                        value: serde_json::json!("US"),
                        is_preset: false,
                    }),
                ],
            },
        };

        assert!(evaluate_rule(&rule, &cart));
    }

    #[test]
    fn test_and_logic_partial_match() {
        let cart = CartInput {
            total: 50.0, // Doesn't match > 100
            shipping_address: Address {
                country_code: "US".to_string(),
                ..Default::default()
            },
            ..Default::default()
        };

        let rule = Rule {
            id: "test".to_string(),
            name: "Test Rule".to_string(),
            complexity: 2,
            enabled: true,
            error_message: "Blocked".to_string(),
            conditions: ConditionGroup {
                operator: LogicalOperator::And,
                criteria: vec![
                    Criterion::Condition(Condition {
                        field: "cart.total".to_string(),
                        operator: ComparisonOperator::GreaterThan,
                        value: serde_json::json!(100.0),
                        is_preset: false,
                    }),
                    Criterion::Condition(Condition {
                        field: "shipping_address.country_code".to_string(),
                        operator: ComparisonOperator::Equals,
                        value: serde_json::json!("US"),
                        is_preset: false,
                    }),
                ],
            },
        };

        assert!(!evaluate_rule(&rule, &cart)); // AND requires both to match
    }

    #[test]
    fn test_or_logic() {
        let cart = CartInput {
            total: 50.0,
            shipping_address: Address {
                country_code: "US".to_string(),
                ..Default::default()
            },
            ..Default::default()
        };

        let rule = Rule {
            id: "test".to_string(),
            name: "Test Rule".to_string(),
            complexity: 2,
            enabled: true,
            error_message: "Blocked".to_string(),
            conditions: ConditionGroup {
                operator: LogicalOperator::Or,
                criteria: vec![
                    Criterion::Condition(Condition {
                        field: "cart.total".to_string(),
                        operator: ComparisonOperator::GreaterThan,
                        value: serde_json::json!(100.0),
                        is_preset: false,
                    }),
                    Criterion::Condition(Condition {
                        field: "shipping_address.country_code".to_string(),
                        operator: ComparisonOperator::Equals,
                        value: serde_json::json!("US"),
                        is_preset: false,
                    }),
                ],
            },
        };

        assert!(evaluate_rule(&rule, &cart)); // OR requires only one to match
    }

    #[test]
    fn test_preset_regex() {
        let cart = CartInput {
            shipping_address: Address {
                address1: "PO Box 456".to_string(),
                ..Default::default()
            },
            ..Default::default()
        };

        let rule = Rule {
            id: "test".to_string(),
            name: "Block PO Box".to_string(),
            complexity: 3,
            enabled: true,
            error_message: "We don't ship to PO Boxes".to_string(),
            conditions: ConditionGroup {
                operator: LogicalOperator::And,
                criteria: vec![Criterion::Condition(Condition {
                    field: "shipping_address.address1".to_string(),
                    operator: ComparisonOperator::RegexMatch,
                    value: serde_json::json!("po_box"),
                    is_preset: true,
                })],
            },
        };

        assert!(evaluate_rule(&rule, &cart));
    }

    #[test]
    fn test_disabled_rule_skipped() {
        let cart = CartInput {
            total: 150.0,
            ..Default::default()
        };

        let config = RulesConfig {
            version: "1.0".to_string(),
            total_complexity: 1,
            rules: vec![Rule {
                id: "test".to_string(),
                name: "Test Rule".to_string(),
                complexity: 1,
                enabled: false, // Disabled
                error_message: "Blocked".to_string(),
                conditions: ConditionGroup {
                    operator: LogicalOperator::And,
                    criteria: vec![Criterion::Condition(Condition {
                        field: "cart.total".to_string(),
                        operator: ComparisonOperator::GreaterThan,
                        value: serde_json::json!(100.0),
                        is_preset: false,
                    })],
                },
            }],
        };

        let result = evaluate_rules(&config, &cart);
        assert!(result.errors.is_empty());
    }

    #[test]
    fn test_multiple_rules_multiple_errors() {
        let cart = CartInput {
            total: 150.0,
            quantity: 10,
            ..Default::default()
        };

        let config = RulesConfig {
            version: "1.0".to_string(),
            total_complexity: 2,
            rules: vec![
                Rule {
                    id: "rule1".to_string(),
                    name: "Max Total".to_string(),
                    complexity: 1,
                    enabled: true,
                    error_message: "Total too high".to_string(),
                    conditions: ConditionGroup {
                        operator: LogicalOperator::And,
                        criteria: vec![Criterion::Condition(Condition {
                            field: "cart.total".to_string(),
                            operator: ComparisonOperator::GreaterThan,
                            value: serde_json::json!(100.0),
                            is_preset: false,
                        })],
                    },
                },
                Rule {
                    id: "rule2".to_string(),
                    name: "Max Quantity".to_string(),
                    complexity: 1,
                    enabled: true,
                    error_message: "Too many items".to_string(),
                    conditions: ConditionGroup {
                        operator: LogicalOperator::And,
                        criteria: vec![Criterion::Condition(Condition {
                            field: "cart.quantity".to_string(),
                            operator: ComparisonOperator::GreaterThan,
                            value: serde_json::json!(5.0),
                            is_preset: false,
                        })],
                    },
                },
            ],
        };

        let result = evaluate_rules(&config, &cart);
        assert_eq!(result.errors.len(), 2);
    }
}

