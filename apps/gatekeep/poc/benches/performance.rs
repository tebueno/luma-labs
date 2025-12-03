//! Performance benchmarks for LogicFlow rule evaluation.
//!
//! Run with: cargo bench
//!
//! These benchmarks validate that the rule engine meets Shopify's
//! 5ms execution budget for checkout validation functions.

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use logicflow::{
    evaluate_rules, CartInput, ComparisonOperator, Condition, ConditionGroup,
    LogicalOperator, Rule, RulesConfig,
};
use logicflow::models::Criterion as RuleCriterion;
use logicflow::patterns::{PO_BOX, UK_POSTCODE, US_ZIP};

/// Generate a test configuration with the specified number of rules and regex patterns.
fn generate_test_config(rule_count: usize, regex_count: usize) -> RulesConfig {
    let mut rules = Vec::with_capacity(rule_count);

    // Generate simple numeric rules (won't match, so all are evaluated)
    for i in 0..(rule_count.saturating_sub(regex_count)) {
        rules.push(Rule {
            id: format!("rule_{}", i),
            name: format!("Numeric Rule {}", i),
            complexity: 1,
            enabled: true,
            error_message: format!("Blocked by rule {}", i),
            conditions: ConditionGroup {
                operator: LogicalOperator::And,
                criteria: vec![RuleCriterion::Condition(Condition {
                    field: "cart.total".to_string(),
                    operator: ComparisonOperator::GreaterThan,
                    value: serde_json::json!(999999.0), // Won't match
                    is_preset: false,
                })],
            },
        });
    }

    // Generate regex rules
    for i in 0..regex_count {
        rules.push(Rule {
            id: format!("regex_{}", i),
            name: format!("Regex Rule {}", i),
            complexity: 3,
            enabled: true,
            error_message: format!("Blocked by regex {}", i),
            conditions: ConditionGroup {
                operator: LogicalOperator::And,
                criteria: vec![RuleCriterion::Condition(Condition {
                    field: "shipping_address.address1".to_string(),
                    operator: ComparisonOperator::RegexMatch,
                    value: serde_json::json!("po_box"),
                    is_preset: true,
                })],
            },
        });
    }

    RulesConfig {
        version: "1.0".to_string(),
        total_complexity: rule_count as u32,
        rules,
    }
}

/// Generate a mock cart for testing.
fn generate_test_cart() -> CartInput {
    CartInput {
        total: 150.0,
        subtotal: 140.0,
        quantity: 3,
        total_weight: 2.5,
        customer_tags: vec!["returning".to_string(), "newsletter".to_string()],
        shipping_address: logicflow::models::Address {
            address1: "123 Main Street".to_string(),
            address2: "Apt 4B".to_string(),
            city: "Los Angeles".to_string(),
            province: "California".to_string(),
            province_code: "CA".to_string(),
            country: "United States".to_string(),
            country_code: "US".to_string(),
            zip: "90210".to_string(),
        },
        line_items: vec![],
    }
}

fn benchmark_rule_counts(c: &mut Criterion) {
    let cart = generate_test_cart();
    let mut group = c.benchmark_group("rule_evaluation");

    for rule_count in [10, 25, 50, 75, 100] {
        let config = generate_test_config(rule_count, 0);
        group.bench_with_input(
            BenchmarkId::new("simple_rules", rule_count),
            &config,
            |b, config| {
                b.iter(|| evaluate_rules(black_box(config), black_box(&cart)));
            },
        );
    }

    group.finish();
}

fn benchmark_with_regex(c: &mut Criterion) {
    let cart = generate_test_cart();
    let mut group = c.benchmark_group("rules_with_regex");

    // Test various combinations of rules and regex
    for (rules, regex) in [(50, 0), (50, 5), (50, 10), (45, 5), (40, 10)] {
        let config = generate_test_config(rules, regex);
        group.bench_with_input(
            BenchmarkId::new(format!("{}_rules_{}_regex", rules, regex), rules + regex),
            &config,
            |b, config| {
                b.iter(|| evaluate_rules(black_box(config), black_box(&cart)));
            },
        );
    }

    group.finish();
}

fn benchmark_json_parsing(c: &mut Criterion) {
    let mut group = c.benchmark_group("json_parsing");

    for rule_count in [10, 50, 100] {
        let config = generate_test_config(rule_count, 0);
        let json = serde_json::to_string(&config).unwrap();

        group.bench_with_input(
            BenchmarkId::new("parse_config", rule_count),
            &json,
            |b, json| {
                b.iter(|| {
                    let _: RulesConfig = serde_json::from_str(black_box(json)).unwrap();
                });
            },
        );
    }

    group.finish();
}

fn benchmark_regex_patterns(c: &mut Criterion) {
    let mut group = c.benchmark_group("regex_patterns");

    let test_addresses = vec![
        "123 Main Street",
        "PO Box 456",
        "P.O. Box 789",
        "456 Oak Avenue",
        "Post Office Box 123",
        "789 Pine Road",
        "555 Elm Drive",
        "321 Cedar Lane",
        "999 Maple Court",
        "100 Birch Way",
    ];

    group.bench_function("po_box_10_strings", |b| {
        b.iter(|| {
            for addr in &test_addresses {
                black_box(PO_BOX.is_match(addr));
            }
        });
    });

    let test_postcodes = vec![
        "SW1A 1AA",
        "EC1A 1BB",
        "M1 1AE",
        "B33 8TH",
        "90210", // Invalid
        "INVALID",
        "W1A 0AX",
        "EH1 1YZ",
        "G1 1AA",
        "L1 8JQ",
    ];

    group.bench_function("uk_postcode_10_strings", |b| {
        b.iter(|| {
            for code in &test_postcodes {
                black_box(UK_POSTCODE.is_match(code));
            }
        });
    });

    let test_zips = vec![
        "90210",
        "90210-1234",
        "00000",
        "12345",
        "12345-6789",
        "ABCDE",
        "1234",
        "123456",
        "55555",
        "99999-9999",
    ];

    group.bench_function("us_zip_10_strings", |b| {
        b.iter(|| {
            for zip in &test_zips {
                black_box(US_ZIP.is_match(zip));
            }
        });
    });

    group.finish();
}

fn benchmark_full_pipeline(c: &mut Criterion) {
    let mut group = c.benchmark_group("full_pipeline");

    // Simulate the full Shopify Function pipeline:
    // 1. Parse JSON config
    // 2. Evaluate rules
    // 3. Return result

    let config = generate_test_config(50, 5);
    let json = serde_json::to_string(&config).unwrap();
    let cart = generate_test_cart();

    group.bench_function("50_rules_5_regex_full_pipeline", |b| {
        b.iter(|| {
            // Parse config (simulates reading from metafield)
            let config: RulesConfig = serde_json::from_str(black_box(&json)).unwrap();

            // Evaluate rules
            let result = evaluate_rules(black_box(&config), black_box(&cart));

            // Return result (minimal overhead)
            black_box(result)
        });
    });

    // Target scenario: 50 rules, 5 regex, must complete in <4ms
    group.bench_function("target_scenario", |b| {
        let config = generate_test_config(50, 5);
        let json = serde_json::to_string(&config).unwrap();

        b.iter(|| {
            let config: RulesConfig = serde_json::from_str(black_box(&json)).unwrap();
            let result = evaluate_rules(black_box(&config), black_box(&cart));
            black_box(result)
        });
    });

    group.finish();
}

criterion_group!(
    benches,
    benchmark_rule_counts,
    benchmark_with_regex,
    benchmark_json_parsing,
    benchmark_regex_patterns,
    benchmark_full_pipeline,
);

criterion_main!(benches);

