//! LogicFlow Checkout Validation Function
//!
//! A simplified vertical slice that validates checkout based on rules
//! stored in an app metafield.

use serde::{Deserialize, Serialize};

mod evaluator;
mod patterns;

use evaluator::{evaluate_rules, CartInput, Address};

// ============================================================================
// Rules Configuration (loaded from metafield)
// ============================================================================

#[derive(Debug, Clone, Deserialize)]
pub struct RulesConfig {
    pub version: String,
    #[serde(default)]
    pub total_complexity: u32,
    pub rules: Vec<Rule>,
}

#[derive(Debug, Clone, Deserialize)]
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

#[derive(Debug, Clone, Deserialize)]
pub struct ConditionGroup {
    pub operator: LogicalOperator,
    pub criteria: Vec<Criterion>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum Criterion {
    Condition(Condition),
    Group(ConditionGroup),
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LogicalOperator {
    And,
    Or,
}

#[derive(Debug, Clone, Deserialize)]
pub struct Condition {
    pub field: String,
    pub operator: ComparisonOperator,
    pub value: serde_json::Value,
    #[serde(default)]
    pub is_preset: bool,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq)]
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
// Shopify Function Input/Output
// ============================================================================

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Input {
    cart: Cart,
    shop: Shop,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Cart {
    cost: CartCost,
    lines: Vec<CartLine>,
    buyer_identity: Option<BuyerIdentity>,
    delivery_groups: Vec<DeliveryGroup>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CartCost {
    total_amount: Money,
    subtotal_amount: Money,
}

#[derive(Deserialize)]
struct Money {
    amount: String,
}

#[derive(Deserialize)]
struct CartLine {
    quantity: i32,
}

#[derive(Deserialize)]
struct BuyerIdentity {
    customer: Option<Customer>,
}

#[derive(Deserialize)]
struct Customer {
    id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeliveryGroup {
    delivery_address: Option<DeliveryAddress>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeliveryAddress {
    address1: Option<String>,
    address2: Option<String>,
    city: Option<String>,
    province_code: Option<String>,
    country_code: Option<String>,
    zip: Option<String>,
}

#[derive(Deserialize)]
struct Shop {
    metafield: Option<Metafield>,
}

#[derive(Deserialize)]
struct Metafield {
    value: String,
}

#[derive(Serialize)]
struct Output {
    errors: Vec<FunctionError>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FunctionError {
    localized_message: String,
    target: String,
}

// ============================================================================
// Main Function Entry Point
// ============================================================================

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Read input from stdin
    let input: Input = serde_json::from_reader(std::io::stdin())?;
    
    // Process the input
    let output = process_input(input);
    
    // Write output to stdout
    serde_json::to_writer(std::io::stdout(), &output)?;
    
    Ok(())
}

fn process_input(input: Input) -> Output {
    // Parse rules configuration from metafield
    let config = match input.shop.metafield.as_ref() {
        Some(metafield) => {
            match serde_json::from_str::<RulesConfig>(&metafield.value) {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("LogicFlow: Failed to parse config: {}", e);
                    return Output { errors: vec![] };
                }
            }
        }
        None => {
            eprintln!("LogicFlow: No rules config found in metafield");
            return Output { errors: vec![] };
        }
    };

    // Skip if no rules
    if config.rules.is_empty() {
        eprintln!("LogicFlow: No rules configured");
        return Output { errors: vec![] };
    }

    // Build cart input from Shopify data
    let cart_input = build_cart_input(&input);

    // Evaluate rules
    let result = evaluate_rules(&config, &cart_input);

    eprintln!(
        "LogicFlow: Evaluated {} rules, {} errors",
        result.rules_evaluated,
        result.errors.len()
    );

    // Convert to output format
    let errors: Vec<FunctionError> = result
        .errors
        .into_iter()
        .map(|e| FunctionError {
            localized_message: e.message,
            target: "cart".to_string(),
        })
        .collect();

    Output { errors }
}

/// Build a CartInput struct from the Shopify input data
fn build_cart_input(input: &Input) -> CartInput {
    let cart = &input.cart;

    // Get total
    let total = cart
        .cost
        .total_amount
        .amount
        .parse::<f64>()
        .unwrap_or(0.0);

    let subtotal = cart
        .cost
        .subtotal_amount
        .amount
        .parse::<f64>()
        .unwrap_or(0.0);

    // Calculate quantity
    let quantity: u32 = cart.lines.iter().map(|l| l.quantity as u32).sum();

    // Get shipping address from first delivery group
    let address = cart
        .delivery_groups
        .first()
        .and_then(|dg| dg.delivery_address.as_ref())
        .map(|da| Address {
            address1: da.address1.clone().unwrap_or_default(),
            address2: da.address2.clone().unwrap_or_default(),
            city: da.city.clone().unwrap_or_default(),
            province_code: da.province_code.clone().unwrap_or_default(),
            country_code: da.country_code.clone().unwrap_or_default(),
            zip: da.zip.clone().unwrap_or_default(),
        })
        .unwrap_or_default();

    CartInput {
        total,
        subtotal,
        quantity,
        total_weight: 0.0,
        customer_tags: vec![],
        shipping_address: address,
        line_items: vec![],
    }
}
