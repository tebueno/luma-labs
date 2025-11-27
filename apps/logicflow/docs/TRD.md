# **Technical Requirements Document (TRD): LogicFlow**

Version: 1.1  
Product: LogicFlow  
Tech Stack: Node.js (Backend), React (Frontend), Rust (Shopify Function), GraphQL (API).

## **1. System Architecture**

The system follows a **Configuration-Execution Split** pattern to maintain performance and flexibility.

### **High-Level Diagram**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CONFIGURATION LAYER                          │
├─────────────────────────────────────────────────────────────────────┤
│  1. Merchant UI (Polaris/React)                                     │
│     └── User defines rules visually                                 │
│                           ↓                                         │
│  2. Compiler (Node.js API)                                          │
│     ├── Validates rule structure                                    │
│     ├── Calculates complexity points                                │
│     ├── Validates regex safety                                      │
│     └── Serializes into optimized JSON                              │
│                           ↓                                         │
│  3. Storage (Shopify Metafields)                                    │
│     └── JSON stored in app_data.rules_config                        │
└─────────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        EXECUTION LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│  4. Runtime (Rust/WASM) - Runs at Checkout                          │
│     ├── Fetches Metafield via GraphQL input                         │
│     ├── Parses JSON config                                          │
│     ├── Evaluates rules against cart data                           │
│     ├── Enforces runtime guardrails                                 │
│     └── Returns FunctionError[] if rules match                      │
└─────────────────────────────────────────────────────────────────────┘
```

## **2. Data Model (The "Rules" JSON)**

To ensure the WASM function is fast, the Metafield data must be lightweight.

**Metafield Key:** `app_data.rules_config`

**Schema Structure (JSON):**

```json
{
  "version": "1.1",
  "total_complexity": 47,
  "rules": [
    {
      "id": "rule_123",
      "name": "Block PO Boxes",
      "complexity": 4,
      "enabled": true,
      "error_message": "We do not ship to PO Boxes.",
      "conditions": {
        "operator": "AND",
        "criteria": [
          {
            "field": "delivery_address.address1",
            "operator": "REGEX_MATCH",
            "value": "po_box_pattern",
            "is_preset": true
          },
          {
            "field": "cart.total_weight",
            "operator": "GREATER_THAN",
            "value": 5000
          }
        ]
      }
    }
  ],
  "regex_patterns": {
    "po_box_pattern": "(?i)\\b(p\\.?\\s*o\\.?\\s*box|post\\s*office\\s*box)\\b",
    "uk_postcode": "^[A-Z]{1,2}\\d[A-Z\\d]?\\s*\\d[A-Z]{2}$"
  }
}
```

### **2.1 Metafield Size Constraints**

| Metafield Type         | Size Limit   | Estimated Rule Capacity |
| ---------------------- | ------------ | ----------------------- |
| Standard App Metafield | 65,535 bytes | ~100-150 rules          |
| Private Metafield      | 2 MB         | ~3,000+ rules           |

**Recommendation:** Use standard App Metafield for MVP. If merchants need >100 rules, consider chunking or private metafields.

## **3. Complexity Points System**

The complexity system ensures predictable performance and honest marketing.

### **3.1 Point Allocation**

| Operation Type              | Points       | Rationale                             |
| --------------------------- | ------------ | ------------------------------------- |
| Numeric comparison          | 1            | O(1) operation                        |
| String equals               | 1            | O(n) but typically short strings      |
| String contains/starts_with | 2            | Substring search, slightly slower     |
| Array includes (tags)       | 2            | Linear scan through array             |
| Nested AND/OR group         | +1 per level | Additional branching overhead         |
| Pre-built regex             | 3            | Known-safe patterns, linear time      |
| Custom regex                | 5            | Variable complexity, needs validation |

### **3.2 Budget Enforcement**

| Plan    | Budget | Max Regex Rules    |
| ------- | ------ | ------------------ |
| Starter | 25     | 5 (pre-built only) |
| Growth  | 100    | 15                 |
| Plus    | 250    | 30                 |

**Runtime Fallback:** If complexity exceeds budget (edge case), the function processes rules in order until budget is exhausted, then stops. This prevents checkout failures.

## **4. Component Specifications**

### **4.1 The Compiler (Node.js Backend)**

**Role:** Validation, complexity calculation, and regex safety checks.

**Framework:** Remix (using @shopify/shopify-app-remix)

**Validation Pipeline:**

```javascript
async function compileRules(rules, plan) {
  // 1. Structure validation
  validateRuleStructure(rules);

  // 2. Calculate complexity
  const totalComplexity = calculateComplexity(rules);
  if (totalComplexity > plan.budget) {
    throw new ComplexityExceededError(totalComplexity, plan.budget);
  }

  // 3. Regex safety validation
  for (const rule of rules) {
    for (const condition of rule.conditions) {
      if (condition.operator === "REGEX_MATCH" && !condition.is_preset) {
        await validateRegexSafety(condition.value);
      }
    }
  }

  // 4. Serialize and save
  const config = serializeConfig(rules, totalComplexity);
  await saveToMetafield(config);
}
```

**API:** Use Shopify Admin GraphQL API to write JSON via `metafieldsSet`.

### **4.2 Regex Safety Layer**

**Critical:** Regex is the primary performance risk. Defense-in-depth approach:

#### **Layer 1: Pre-built Library (Safest)**

Curated, benchmarked patterns stored server-side:

```javascript
const PRESET_PATTERNS = {
  po_box: {
    pattern: "(?i)\\b(p\\.?\\s*o\\.?\\s*box|post\\s*office\\s*box)\\b",
    benchmark_ms: 0.02,
    description: "Detects PO Box addresses",
  },
  uk_postcode: {
    pattern: "^[A-Z]{1,2}\\d[A-Z\\d]?\\s*\\d[A-Z]{2}$",
    benchmark_ms: 0.01,
    description: "Validates UK postcodes",
  },
  us_zip: {
    pattern: "^\\d{5}(-\\d{4})?$",
    benchmark_ms: 0.01,
    description: "Validates US ZIP codes",
  },
  email_basic: {
    pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
    benchmark_ms: 0.01,
    description: "Basic email format check",
  },
};
```

#### **Layer 2: Compile-Time Validation (Custom Regex)**

```javascript
const safeRegex = require("safe-regex2");

async function validateRegexSafety(pattern) {
  // Check for catastrophic backtracking potential
  if (!safeRegex(pattern)) {
    throw new UnsafeRegexError(
      "This pattern may cause performance issues. Please simplify or use a pre-built pattern."
    );
  }

  // Benchmark against test strings
  const testStrings = generateTestStrings(1000);
  const start = performance.now();
  const re = new RegExp(pattern);
  testStrings.forEach((s) => re.test(s));
  const elapsed = performance.now() - start;

  // Reject if average > 0.05ms per test
  if (elapsed > 50) {
    throw new SlowRegexError(
      `This pattern is too slow (${(elapsed / 1000).toFixed(
        2
      )}ms avg). Please simplify.`
    );
  }

  return true;
}
```

#### **Layer 3: Safe Regex Engine (Rust)**

Use Rust's `regex` crate which guarantees **linear time** execution:

```rust
// In Cargo.toml
[dependencies]
regex = "1"  // Guarantees O(n) - no catastrophic backtracking
```

### **4.3 The Runtime Function (Rust)**

**Input:** `run.graphql` must query the Shop Metafield AND Cart data.

**Performance Budget:**

- Total execution: < 4ms (leaving 1ms buffer under Shopify's 5ms limit)
- JSON parsing: < 0.5ms
- Rule evaluation: < 3ms
- Response building: < 0.5ms

**Runtime Guardrails:**

```rust
use regex::Regex;
use std::time::Instant;

const MAX_RULES: usize = 100;
const MAX_REGEX_RULES: usize = 30;
const EXECUTION_BUDGET_MS: u128 = 3;

fn run(input: Input) -> Result<FunctionResult> {
    let start = Instant::now();
    let config: RulesConfig = serde_json::from_str(&input.shop.metafield.value)?;

    let mut errors = Vec::new();
    let mut regex_count = 0;

    for (idx, rule) in config.rules.iter().enumerate() {
        // Guardrail 1: Max rules
        if idx >= MAX_RULES {
            eprintln!("Warning: Rule limit reached, skipping remaining rules");
            break;
        }

        // Guardrail 2: Max regex rules
        if rule.uses_regex() {
            regex_count += 1;
            if regex_count > MAX_REGEX_RULES {
                eprintln!("Warning: Regex rule limit reached");
                continue;
            }
        }

        // Guardrail 3: Time budget
        if start.elapsed().as_millis() > EXECUTION_BUDGET_MS {
            eprintln!("Warning: Time budget exceeded at rule {}", idx);
            break;
        }

        // Evaluate rule
        if evaluate_rule(rule, &input.cart) {
            errors.push(FunctionError {
                localized_message: rule.error_message.clone(),
                target: "cart".to_string(),
            });
        }
    }

    eprintln!("Execution time: {}ms", start.elapsed().as_millis());
    Ok(FunctionResult { errors })
}
```

### **4.4 The Frontend (React + Polaris)**

- **Library:** @shopify/polaris for UI components.
- **State Management:** React Hook Form for handling the complex rule builder form.
- **Preview:** Real-time visual representation of the logic flow.
- **Complexity Meter:** Visual budget indicator updating as rules are built.

```jsx
// Complexity Budget Component
function ComplexityMeter({ used, total }) {
  const percentage = (used / total) * 100;
  const status =
    percentage > 90 ? "critical" : percentage > 70 ? "warning" : "success";

  return (
    <Card>
      <ProgressBar progress={percentage} tone={status} />
      <Text>
        {used} of {total} complexity points used
      </Text>
    </Card>
  );
}
```

## **5. API & Integration Requirements**

- **Shopify Functions API:** Target `cart-checkout-validation` extension point.
- **Required Permissions:**
  - `read_products` - Access product data for SKU-based rules
  - `read_customers` - Access customer tags
  - `read_metaobjects` - Access rules configuration
  - `write_metafields` - Save rules configuration

## **6. Security & Limitations**

### **6.1 Data Privacy**

- No PII (Personally Identifiable Information) stored in the Rules Config Metafield.
- The function reads PII (address) at runtime but does not store it.
- All rule evaluation happens server-side on Shopify's infrastructure.

### **6.2 Performance Guarantees**

- Maximum JSON config size: 65KB (standard metafield)
- Maximum rules: 100 (hard limit in runtime)
- Maximum regex rules: 30 (hard limit in runtime)
- Target execution time: < 4ms

### **6.3 Failure Modes**

| Failure                  | Behavior                        | User Impact                     |
| ------------------------ | ------------------------------- | ------------------------------- |
| Metafield fetch fails    | Return empty errors array       | Checkout proceeds (fail-open)   |
| JSON parse fails         | Return empty errors array       | Checkout proceeds (fail-open)   |
| Time budget exceeded     | Stop processing, return partial | Some rules may not evaluate     |
| Invalid regex at runtime | Skip that rule, log error       | That specific rule doesn't fire |

**Philosophy:** Fail-open. Never block checkout due to LogicFlow errors. Log everything for debugging.

## **7. Pre-Build Proof of Concept Requirements**

Before full development, validate performance assumptions:

### **POC Goals**

1. Prove 50 rules with 5 regex patterns executes in < 4ms
2. Validate Rust's `regex` crate performance in WASM
3. Confirm metafield fetch latency is acceptable

### **POC Implementation**

```rust
// Minimal POC to benchmark
#[cfg(test)]
mod benchmarks {
    use super::*;
    use std::time::Instant;

    #[test]
    fn benchmark_50_rules_with_regex() {
        let config = generate_test_config(50, 5); // 50 rules, 5 regex
        let cart = generate_test_cart();

        let start = Instant::now();
        let result = evaluate_all_rules(&config, &cart);
        let elapsed = start.elapsed();

        println!("50 rules + 5 regex: {:?}", elapsed);
        assert!(elapsed.as_millis() < 4, "Exceeded 4ms budget");
    }
}
```

**Success Criteria:** POC must pass before committing to full build.
