//! LogicFlow POC - Checkout Validation Rule Engine
//!
//! This crate implements a high-performance rule evaluation engine
//! designed to run within Shopify Functions' strict execution limits.

pub mod evaluator;
pub mod models;
pub mod patterns;

pub use evaluator::evaluate_rules;
pub use models::{CartInput, ComparisonOperator, Condition, ConditionGroup, LogicalOperator, Rule, RulesConfig};
pub use patterns::get_preset_pattern;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_config() {
        let json = r#"{
            "version": "1.0",
            "total_complexity": 5,
            "rules": [
                {
                    "id": "rule_1",
                    "name": "Test Rule",
                    "complexity": 1,
                    "enabled": true,
                    "error_message": "Blocked",
                    "conditions": {
                        "operator": "AND",
                        "criteria": [
                            {
                                "field": "cart.total",
                                "operator": "GREATER_THAN",
                                "value": 100.0
                            }
                        ]
                    }
                }
            ]
        }"#;

        let config: RulesConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.version, "1.0");
        assert_eq!(config.rules.len(), 1);
        assert_eq!(config.rules[0].name, "Test Rule");
    }
}

