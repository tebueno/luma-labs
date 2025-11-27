//! Rule evaluation engine for the Shopify Function.

use crate::{
    ComparisonOperator, Condition, ConditionGroup, Criterion, LogicalOperator, Rule, RulesConfig,
};
use crate::patterns::check_preset;

// ============================================================================
// Cart Input (simplified for vertical slice)
// ============================================================================

#[derive(Debug, Clone, Default)]
pub struct CartInput {
    pub total: f64,
    pub subtotal: f64,
    pub quantity: u32,
    pub total_weight: f64,
    pub customer_tags: Vec<String>,
    pub shipping_address: Address,
    pub line_items: Vec<LineItem>,
}

#[derive(Debug, Clone, Default)]
pub struct Address {
    pub address1: String,
    pub address2: String,
    pub city: String,
    pub province_code: String,
    pub country_code: String,
    pub zip: String,
}

#[derive(Debug, Clone, Default)]
pub struct LineItem {
    pub product_id: String,
    pub variant_id: String,
    pub sku: String,
    pub vendor: String,
    pub quantity: u32,
    pub price: f64,
}

// ============================================================================
// Evaluation Result
// ============================================================================

pub struct EvaluationResult {
    pub errors: Vec<ValidationError>,
    pub rules_evaluated: usize,
}

pub struct ValidationError {
    pub rule_id: String,
    pub message: String,
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

const MAX_RULES: usize = 100;
const MAX_REGEX_RULES: usize = 30;

pub fn evaluate_rules(config: &RulesConfig, cart: &CartInput) -> EvaluationResult {
    let mut errors = Vec::new();
    let mut rules_evaluated = 0;
    let mut regex_count = 0;

    for rule in &config.rules {
        if rules_evaluated >= MAX_RULES {
            break;
        }

        if !rule.enabled {
            continue;
        }

        if rule_uses_regex(&rule.conditions) {
            regex_count += 1;
            if regex_count > MAX_REGEX_RULES {
                continue;
            }
        }

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
    }
}

fn rule_uses_regex(group: &ConditionGroup) -> bool {
    group.criteria.iter().any(|criterion| match criterion {
        Criterion::Condition(c) => c.operator == ComparisonOperator::RegexMatch,
        Criterion::Group(g) => rule_uses_regex(g),
    })
}

fn evaluate_rule(rule: &Rule, cart: &CartInput) -> bool {
    evaluate_group(&rule.conditions, cart)
}

fn evaluate_group(group: &ConditionGroup, cart: &CartInput) -> bool {
    match group.operator {
        LogicalOperator::And => group
            .criteria
            .iter()
            .all(|c| evaluate_criterion(c, cart)),
        LogicalOperator::Or => group
            .criteria
            .iter()
            .any(|c| evaluate_criterion(c, cart)),
    }
}

fn evaluate_criterion(criterion: &Criterion, cart: &CartInput) -> bool {
    match criterion {
        Criterion::Condition(c) => evaluate_condition(c, cart),
        Criterion::Group(g) => evaluate_group(g, cart),
    }
}

// ============================================================================
// Field Value Extraction
// ============================================================================

enum FieldValue {
    String(String),
    Number(f64),
    StringArray(Vec<String>),
}

fn get_field_value(field: &str, cart: &CartInput) -> Option<FieldValue> {
    match field {
        "cart.total" => Some(FieldValue::Number(cart.total)),
        "cart.subtotal" => Some(FieldValue::Number(cart.subtotal)),
        "cart.quantity" => Some(FieldValue::Number(cart.quantity as f64)),
        "cart.total_weight" => Some(FieldValue::Number(cart.total_weight)),
        "customer.tags" => Some(FieldValue::StringArray(cart.customer_tags.clone())),
        "shipping_address.address1" => Some(FieldValue::String(cart.shipping_address.address1.clone())),
        "shipping_address.address2" => Some(FieldValue::String(cart.shipping_address.address2.clone())),
        "shipping_address.city" => Some(FieldValue::String(cart.shipping_address.city.clone())),
        "shipping_address.province_code" => Some(FieldValue::String(cart.shipping_address.province_code.clone())),
        "shipping_address.country_code" => Some(FieldValue::String(cart.shipping_address.country_code.clone())),
        "shipping_address.zip" => Some(FieldValue::String(cart.shipping_address.zip.clone())),
        _ => None,
    }
}

// ============================================================================
// Condition Evaluation
// ============================================================================

fn evaluate_condition(condition: &Condition, cart: &CartInput) -> bool {
    let field_value = match get_field_value(&condition.field, cart) {
        Some(v) => v,
        None => return false,
    };

    compare(&field_value, &condition.operator, &condition.value, condition.is_preset)
}

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
        (FieldValue::String(s), serde_json::Value::String(cv)) => {
            s.to_lowercase() == cv.to_lowercase()
        }
        (FieldValue::Number(n), serde_json::Value::Number(cv)) => {
            cv.as_f64().map_or(false, |cv| (*n - cv).abs() < f64::EPSILON)
        }
        _ => false,
    }
}

fn compare_numeric<F>(field_value: &FieldValue, condition_value: &serde_json::Value, cmp: F) -> bool
where
    F: Fn(f64, f64) -> bool,
{
    match field_value {
        FieldValue::Number(n) => condition_value.as_f64().map_or(false, |cv| cmp(*n, cv)),
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

    if is_preset {
        return check_preset(pattern_str, field_str);
    }

    // For non-preset patterns in vertical slice, just do contains check
    field_str.to_lowercase().contains(&pattern_str.to_lowercase())
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

