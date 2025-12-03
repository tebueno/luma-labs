# Gatekeep POC Implementation Plan

## Objective

Validate the core technical assumption: **Can we evaluate 50+ rules with regex patterns in <4ms within a Shopify Function WASM environment?**

## Timeline: 5 Working Days

---

## Day 1: Environment Setup & Scaffolding

### Goals

- [ ] Set up Rust development environment with WASM target
- [ ] Create Shopify app scaffold with Function extension
- [ ] Verify basic Function deploys and runs

### Tasks

**1.1 Local Setup**

```bash
# Install Rust + WASM target
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Add WASM target (note: wasm32-wasi is deprecated, use wasip1)
rustup target add wasm32-wasip1

# Install cargo-wasi for easier builds
cargo install cargo-wasi

# Install Shopify CLI
npm install -g @shopify/cli@latest

# Verify
cargo --version
shopify version
```

> **Note:** See [SETUP.md](./SETUP.md) for complete setup instructions and [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues.

**1.2 Create Shopify App**

```bash
shopify app init --template=remix
cd gatekeep
shopify app generate extension --type=cart_checkout_validation --name=gatekeep-validator
```

**1.3 Verify Deployment**

- Deploy to dev store
- Confirm function appears in Checkout Rules
- Test with a hardcoded "always block" rule

### Deliverable

Working Shopify Function that blocks checkout with a hardcoded message

---

## Day 2: Core Rule Engine (Rust)

### Goals

- [ ] Define rule data structures
- [ ] Implement condition evaluation logic
- [ ] Write unit tests for basic conditions

### Tasks

**2.1 Define Data Structures**

The data models are already scaffolded in `poc/src/models.rs`. Review and adjust as needed.

Key structures:
- `RulesConfig` - Top-level configuration
- `Rule` - Single validation rule
- `ConditionGroup` - AND/OR logic groups
- `Condition` - Single comparison condition

**2.2 Implement Evaluator**

The evaluator is scaffolded in `poc/src/evaluator.rs`. Key functions:
- `evaluate_rules()` - Main entry point
- `evaluate_group()` - AND/OR logic
- `evaluate_condition()` - Single condition comparison

**2.3 Run Unit Tests**

```bash
cd apps/gatekeep/poc
cargo test
```

### Deliverable

Rule evaluation engine with passing unit tests for numeric, string, and logical operations

---

## Day 3: Regex Integration & Safety

### Goals

- [ ] Add regex support using Rust's `regex` crate
- [ ] Implement pre-built pattern system
- [ ] Benchmark regex performance

### Tasks

**3.1 Review Pre-built Patterns**

Patterns are defined in `poc/src/patterns.rs`:
- `po_box` - PO Box detection
- `uk_postcode` - UK postcode validation
- `us_zip` - US ZIP code validation
- `ca_postal` - Canadian postal code
- `email_basic` - Basic email format
- `us_phone` - US phone number

**3.2 Run Pattern Tests**

```bash
cargo test patterns
```

**3.3 Benchmark Regex Performance**

```bash
cargo bench regex_patterns
```

Expected: <0.1ms per pattern check on 10 strings

### Deliverable

Regex evaluation working with benchmarks proving <0.1ms per pattern check

---

## Day 4: Full Integration & Load Testing

### Goals

- [ ] Connect rule engine to Shopify Function input
- [ ] Implement JSON config parsing from metafield
- [ ] Run load tests with 50 rules + 5 regex

### Tasks

**4.1 Run Full Benchmarks**

```bash
cargo bench
```

**4.2 Key Benchmarks to Watch**

| Benchmark | Target |
|-----------|--------|
| `simple_rules/50` | <1ms |
| `rules_with_regex/50_rules_5_regex` | <2ms |
| `json_parsing/50` | <0.5ms |
| `full_pipeline/target_scenario` | <4ms |

**4.3 Integrate with Shopify Function**

Copy the rule engine logic into the Shopify Function extension:

```rust
// extensions/gatekeep-validator/src/run.rs
use shopify_function::prelude::*;

#[shopify_function_target(query_path = "src/run.graphql", schema_path = "schema.graphql")]
fn run(input: input::ResponseData) -> Result<output::FunctionRunResult> {
    let start = std::time::Instant::now();
    
    // Parse config from metafield
    let config: RulesConfig = match &input.shop.metafield {
        Some(mf) => serde_json::from_str(&mf.value)?,
        None => return Ok(output::FunctionRunResult { errors: vec![] }),
    };
    
    // Evaluate rules
    let result = evaluate_rules(&config, &input.cart);
    
    eprintln!("Gatekeep: {} rules in {:?}", result.rules_evaluated, start.elapsed());
    
    Ok(output::FunctionRunResult { 
        errors: result.errors.into_iter().map(|e| output::FunctionError {
            localized_message: e.message,
            target: "cart".to_string(),
        }).collect()
    })
}
```

### Deliverable

Full integration test proving 50 rules + 5 regex executes in <4ms

---

## Day 5: Real Checkout Test & Documentation

### Goals

- [ ] Test with real metafield in dev store
- [ ] Measure actual checkout latency
- [ ] Document findings and decision

### Tasks

**5.1 Create Test Metafield**

```graphql
mutation {
  metafieldsSet(metafields: [
    {
      namespace: "app_data"
      key: "rules_config"
      ownerId: "gid://shopify/Shop/YOUR_SHOP_ID"
      type: "json"
      value: "{\"version\":\"1.0\",\"rules\":[...]}"
    }
  ]) {
    metafields { id }
    userErrors { message }
  }
}
```

**5.2 E2E Test in Checkout**

1. Deploy function to dev store
2. Enable Gatekeep in Checkout Rules
3. Add items to cart
4. Proceed to checkout
5. Check Partner Dashboard for function logs
6. Record execution times

**5.3 Document Results**

Create `POC-RESULTS.md` with:
- Test environment details
- Benchmark results table
- Real checkout test results
- Go/No-Go decision

### Deliverable

Documented POC results with clear go/no-go decision

---

## Go/No-Go Criteria

| Criterion | Threshold | Weight |
|-----------|-----------|--------|
| 50 rules + 5 regex execution | <4ms | **Must pass** |
| Real checkout function logs | <5ms | **Must pass** |
| JSON parsing | <0.5ms | Should pass |
| No memory errors | Zero | **Must pass** |
| Metafield sync works | Instant | **Must pass** |

**Decision Rule:**
- All "Must pass" criteria met → **GO**
- Any "Must pass" fails → **NO-GO** (revisit architecture)
- "Should pass" fails → **GO with caution** (optimize in Phase 1)

---

## Running the POC Benchmarks

### Prerequisites

```bash
# Ensure Rust is installed
rustup --version

# Navigate to POC directory
cd apps/gatekeep/poc
```

### Run Tests

```bash
# Run all unit tests
cargo test

# Run tests with output
cargo test -- --nocapture
```

### Run Benchmarks

```bash
# Run all benchmarks
cargo bench

# Run specific benchmark group
cargo bench rule_evaluation
cargo bench regex_patterns
cargo bench full_pipeline
```

### Interpret Results

Criterion outputs results in `target/criterion/`. Key metrics:

- **Mean**: Average execution time
- **Std Dev**: Variability (lower is better)
- **Throughput**: Operations per second

For the POC to pass, the `target_scenario` benchmark must show:
- Mean < 4ms
- 99th percentile < 5ms

---

## Next Steps After POC

### If GO

1. **Week 2-3:** Build Node.js compiler (complexity calculator, regex validator)
2. **Week 4-5:** Build React UI (rule builder, complexity meter)
3. **Week 6:** Integration testing, beta merchant recruitment
4. **Week 7-8:** Polish, App Store submission

### If NO-GO

Depending on the blocker:

| Blocker | Mitigation |
|---------|------------|
| Regex too slow | Restrict to pre-built patterns only, no custom regex |
| 50 rules too slow | Lower limits (30 rules max) or implement "early exit on first match" |
| JSON parsing slow | Pre-compile to binary format instead of JSON |
| Fundamental issue | Pivot to different architecture or reconsider the product |

---

## Files Reference

| File | Purpose |
|------|---------|
| `poc/Cargo.toml` | Rust project configuration |
| `poc/src/lib.rs` | Library entry point |
| `poc/src/models.rs` | Data structures for rules and cart |
| `poc/src/evaluator.rs` | Rule evaluation engine |
| `poc/src/patterns.rs` | Pre-built regex patterns |
| `poc/benches/performance.rs` | Criterion benchmarks |

