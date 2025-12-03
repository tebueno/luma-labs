//! Data models for LogicFlow rule configuration and cart input.

use serde::{Deserialize, Serialize};

/// Top-level configuration stored in Shopify metafield.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RulesConfig {
    pub version: String,
    #[serde(default)]
    pub total_complexity: u32,
    pub rules: Vec<Rule>,
}

/// A single validation rule.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub complexity: u32,
    #[serde(default = "default_true")]
    pub enabled: bool,
    pub error_message: String,
    pub conditions: ConditionGroup,
}

fn default_true() -> bool {
    true
}

/// A group of conditions combined with AND/OR logic.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConditionGroup {
    pub operator: LogicalOperator,
    pub criteria: Vec<Criterion>,
}

/// A criterion can be either a single condition or a nested group.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Criterion {
    Condition(Condition),
    Group(ConditionGroup),
}

/// Logical operator for combining conditions.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LogicalOperator {
    And,
    Or,
}

/// A single condition comparing a field to a value.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Condition {
    pub field: String,
    pub operator: ComparisonOperator,
    pub value: serde_json::Value,
    /// If true, `value` is a key into the preset patterns map.
    #[serde(default)]
    pub is_preset: bool,
}

/// Comparison operators for conditions.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ComparisonOperator {
    Equals,
    NotEquals,
    GreaterThan,
    GreaterThanOrEqual,
    LessThan,
    LessThanOrEqual,
    Contains,
    NotContains,
    StartsWith,
    EndsWith,
    RegexMatch,
    In,
    NotIn,
}

// ============================================================================
// Cart Input Models (simplified for POC)
// ============================================================================

/// Simplified cart input for POC benchmarking.
/// In production, this will be generated from Shopify's GraphQL schema.
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
    pub province: String,
    pub province_code: String,
    pub country: String,
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
    pub properties: std::collections::HashMap<String, String>,
}

impl CartInput {
    /// Get a field value by path (e.g., "cart.total", "shipping_address.zip").
    pub fn get_field(&self, path: &str) -> Option<FieldValue> {
        let parts: Vec<&str> = path.split('.').collect();
        
        match parts.as_slice() {
            ["cart", "total"] => Some(FieldValue::Number(self.total)),
            ["cart", "subtotal"] => Some(FieldValue::Number(self.subtotal)),
            ["cart", "quantity"] => Some(FieldValue::Number(self.quantity as f64)),
            ["cart", "total_weight"] => Some(FieldValue::Number(self.total_weight)),
            ["customer", "tags"] => Some(FieldValue::StringArray(self.customer_tags.clone())),
            ["shipping_address", "address1"] => Some(FieldValue::String(self.shipping_address.address1.clone())),
            ["shipping_address", "address2"] => Some(FieldValue::String(self.shipping_address.address2.clone())),
            ["shipping_address", "city"] => Some(FieldValue::String(self.shipping_address.city.clone())),
            ["shipping_address", "province"] => Some(FieldValue::String(self.shipping_address.province.clone())),
            ["shipping_address", "province_code"] => Some(FieldValue::String(self.shipping_address.province_code.clone())),
            ["shipping_address", "country"] => Some(FieldValue::String(self.shipping_address.country.clone())),
            ["shipping_address", "country_code"] => Some(FieldValue::String(self.shipping_address.country_code.clone())),
            ["shipping_address", "zip"] => Some(FieldValue::String(self.shipping_address.zip.clone())),
            _ => None,
        }
    }
}

/// Represents a field value that can be compared.
#[derive(Debug, Clone)]
pub enum FieldValue {
    String(String),
    Number(f64),
    Bool(bool),
    StringArray(Vec<String>),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deserialize_logical_operator() {
        let json = r#""AND""#;
        let op: LogicalOperator = serde_json::from_str(json).unwrap();
        assert_eq!(op, LogicalOperator::And);
    }

    #[test]
    fn test_deserialize_comparison_operator() {
        let json = r#""GREATER_THAN""#;
        let op: ComparisonOperator = serde_json::from_str(json).unwrap();
        assert_eq!(op, ComparisonOperator::GreaterThan);
    }

    #[test]
    fn test_cart_get_field() {
        let cart = CartInput {
            total: 150.0,
            shipping_address: Address {
                zip: "90210".to_string(),
                ..Default::default()
            },
            ..Default::default()
        };

        assert!(matches!(cart.get_field("cart.total"), Some(FieldValue::Number(150.0))));
        assert!(matches!(cart.get_field("shipping_address.zip"), Some(FieldValue::String(s)) if s == "90210"));
        assert!(cart.get_field("invalid.field").is_none());
    }
}

