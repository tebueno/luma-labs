# **Quality Assurance & Testing Strategy: LogicFlow**

Version: 1.1

## **1. Testing Environment Setup**

Testing Shopify Functions requires a specific environment setup because functions run on Shopify's infrastructure, not your local server.

### **Prerequisites**

1. **Shopify CLI 3.x:** Ensure you are running the latest version (`npm install -g @shopify/cli`).
2. **Development Store:** You must use a Development Store with **Checkout Extensibility Preview** enabled.
3. **Rust Toolchain:** Ensure `cargo` and `wasm32-wasi` target are installed for compiling the function.

```bash
# Install Rust and WASM target
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-wasi
```

---

## **2. Pre-Build Performance POC (CRITICAL)**

**Before writing any frontend code**, validate that the core performance assumptions are achievable.

### **2.1 POC Success Criteria**

| Metric                      | Target  | Must Pass |
| --------------------------- | ------- | --------- |
| 50 simple rules             | < 2ms   | ✅        |
| 50 rules + 5 regex patterns | < 4ms   | ✅        |
| JSON parse (65KB config)    | < 0.5ms | ✅        |
| Single regex evaluation     | < 0.1ms | ✅        |

### **2.2 POC Implementation**

Create a standalone Rust project to benchmark before integrating with Shopify:

```rust
// benches/performance_poc.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use regex::Regex;
use serde_json;

fn benchmark_rule_evaluation(c: &mut Criterion) {
    let config = generate_test_config(50, 5);
    let cart = generate_test_cart();

    c.bench_function("50 rules + 5 regex", |b| {
        b.iter(|| evaluate_all_rules(black_box(&config), black_box(&cart)))
    });
}

fn benchmark_json_parse(c: &mut Criterion) {
    let json = generate_large_config_json(100); // 100 rules

    c.bench_function("parse 100 rule config", |b| {
        b.iter(|| serde_json::from_str::<RulesConfig>(black_box(&json)))
    });
}

fn benchmark_regex_precompiled(c: &mut Criterion) {
    let re = Regex::new(r"(?i)\b(p\.?\s*o\.?\s*box|post\s*office\s*box)\b").unwrap();
    let test_strings = vec![
        "123 Main Street",
        "PO Box 456",
        "P.O. Box 789",
        "Post Office Box 123",
        "456 Oak Avenue Apt 2B",
    ];

    c.bench_function("po_box regex x5", |b| {
        b.iter(|| {
            for s in &test_strings {
                black_box(re.is_match(s));
            }
        })
    });
}

criterion_group!(benches, benchmark_rule_evaluation, benchmark_json_parse, benchmark_regex_precompiled);
criterion_main!(benches);
```

### **2.3 POC Checklist**

- [ ] Create standalone Rust benchmark project
- [ ] Implement mock rule evaluation logic
- [ ] Run benchmarks on WASM target (`cargo bench --target wasm32-wasi`)
- [ ] Document results
- [ ] **Decision gate:** If any metric fails, revisit architecture before proceeding

---

## **3. Testing Levels**

### **Level 1: Unit Testing (Rust)**

Test the logic _locally_ without deploying to Shopify.

**Tool:** `cargo test`

**Method:** Create mock Input structs (simulating a cart) and pass them to your `run()` function.

**Scenarios to Cover:**

| Test Case                 | Input                              | Expected Output    |
| ------------------------- | ---------------------------------- | ------------------ |
| Empty Rule Set            | No rules configured                | No errors returned |
| Single Rule Match         | Cart total $150, rule blocks >$100 | Error with message |
| Single Rule No Match      | Cart total $50, rule blocks >$100  | No errors          |
| AND Logic (all match)     | Both conditions true               | Error returned     |
| AND Logic (partial match) | One condition false                | No error           |
| OR Logic (any match)      | One condition true                 | Error returned     |
| Nested Logic              | Complex AND/OR tree                | Correct evaluation |

### **Level 2: Complexity Budget Testing**

Verify the complexity calculation is accurate and enforced.

**Tool:** Jest (Node.js backend tests)

```javascript
describe("Complexity Calculator", () => {
  test("numeric comparison = 1 point", () => {
    const rule = {
      conditions: [
        { operator: "GREATER_THAN", field: "cart.total", value: 100 },
      ],
    };
    expect(calculateComplexity(rule)).toBe(1);
  });

  test("pre-built regex = 3 points", () => {
    const rule = { conditions: [{ operator: "REGEX_MATCH", is_preset: true }] };
    expect(calculateComplexity(rule)).toBe(3);
  });

  test("custom regex = 5 points", () => {
    const rule = {
      conditions: [{ operator: "REGEX_MATCH", is_preset: false }],
    };
    expect(calculateComplexity(rule)).toBe(5);
  });

  test("nested AND adds 1 point per level", () => {
    const rule = {
      conditions: {
        operator: "AND",
        criteria: [
          { operator: "GREATER_THAN" }, // 1
          {
            operator: "AND",
            criteria: [
              // +1 nesting
              { operator: "EQUALS" }, // 1
              { operator: "EQUALS" }, // 1
            ],
          },
        ],
      },
    };
    expect(calculateComplexity(rule)).toBe(4); // 1 + 1 + 1 + 1
  });

  test("rejects when over budget", async () => {
    const rules = generateRulesWithComplexity(30); // 30 points
    const plan = { budget: 25 };

    await expect(compileRules(rules, plan)).rejects.toThrow(
      ComplexityExceededError
    );
  });
});
```

### **Level 3: Regex Safety Testing**

Critical tests to ensure unsafe regex patterns are rejected.

**Tool:** Jest (Node.js backend tests)

```javascript
describe("Regex Safety Validation", () => {
  test("accepts safe pattern", async () => {
    const pattern = "^[A-Z]{1,2}\\d[A-Z\\d]?\\s*\\d[A-Z]{2}$"; // UK postcode
    await expect(validateRegexSafety(pattern)).resolves.toBe(true);
  });

  test("rejects catastrophic backtracking pattern", async () => {
    const pattern = "^(a+)+$"; // Classic ReDoS pattern
    await expect(validateRegexSafety(pattern)).rejects.toThrow(
      UnsafeRegexError
    );
  });

  test("rejects slow pattern", async () => {
    const pattern = ".*.*.*.*.*.*.*.*.*.*"; // Slow but not "unsafe"
    await expect(validateRegexSafety(pattern)).rejects.toThrow(SlowRegexError);
  });

  test("pre-built patterns are always safe", () => {
    for (const [name, preset] of Object.entries(PRESET_PATTERNS)) {
      expect(safeRegex(preset.pattern)).toBe(true);
      expect(preset.benchmark_ms).toBeLessThan(0.1);
    }
  });
});
```

### **Level 4: Integration Testing (The Compiler)**

Test if the UI correctly saves data to the Metafield.

**Action:** Create a rule in the UI → Save.

**Verification:** Use Shopify Admin GraphQL Explorer to inspect the shop resource.

**Checks:**

- [ ] Is the JSON valid?
- [ ] Are special characters escaped correctly?
- [ ] Is `total_complexity` calculated correctly?
- [ ] Are preset regex patterns referenced by ID (not inlined)?

### **Level 5: End-to-End (E2E) in Shopify Checkout**

This is the critical step to verify the "User Experience" at checkout.

**Step-by-Step E2E Guide:**

1. **Deploy:** Run `shopify app deploy`. This pushes the WASM binary to Shopify.
2. **Enable:** Go to **Settings > Checkout > Checkout Rules** in your Dev Store. You should see "LogicFlow" listed. Add it.
3. **Configure:** Open the LogicFlow App Admin. Create a rule: _"Block if Total > $1000"_.
4. **Simulate:**
   - Open your Online Store storefront.
   - Add items totaling $1500 to the cart.
   - Proceed to Checkout.
   - **Expected Result:** You should be blocked from paying. The error message defined in LogicFlow should appear near the "Pay Now" button.
5. **Modify & Retry:**
   - Go back to the App. Change the limit to $2000. Save.
   - Refresh Checkout.
   - **Expected Result:** You should now be able to proceed. (This confirms the Metafield instant-update mechanism works).

---

## **4. Specific Test Scenarios for LogicFlow**

| Scenario ID | Test Case                           | Expected Outcome                                                                      | Priority |
| ----------- | ----------------------------------- | ------------------------------------------------------------------------------------- | -------- |
| **LF-01**   | **The "5-Function" Bypass**         | Create 6 distinct rules in LogicFlow. All should evaluate using single function slot. | P0       |
| **LF-02**   | **Pre-built Regex (PO Box)**        | Create rule using PO Box preset. Enter "PO Box 123".                                  | P0       |
| **LF-03**   | **Pre-built Regex (UK Postcode)**   | Create rule blocking non-UK addresses. Enter "SW1A 1AA".                              | P1       |
| **LF-04**   | **Custom Regex Validation**         | Enter unsafe pattern `^(a+)+$`. Should be rejected at save.                           | P0       |
| **LF-05**   | **Custom Regex Slow**               | Enter slow pattern. Should show warning/rejection.                                    | P1       |
| **LF-06**   | **Complexity Budget Limit**         | Create rules until budget exceeded. Save should be blocked.                           | P0       |
| **LF-07**   | **Complexity Meter UI**             | Add rules and verify meter updates in real-time.                                      | P1       |
| **LF-08**   | **Performance Load (50 rules)**     | Create 50 active rules. Enter checkout. Must complete < 5ms.                          | P0       |
| **LF-09**   | **Performance Load (50 + 5 regex)** | 50 rules with 5 regex patterns. Enter checkout. Must complete < 5ms.                  | P0       |
| **LF-10**   | **Line Item Properties**            | Add product with property `Engraving: BadWord`. Rule blocks profanity.                | P1       |
| **LF-11**   | **Fail-Open Behavior**              | Corrupt the metafield JSON. Checkout should still proceed.                            | P0       |
| **LF-12**   | **Nested AND/OR Logic**             | Create complex nested conditions. Verify correct evaluation.                          | P1       |

---

## **5. Performance Monitoring**

### **5.1 Runtime Logging**

Use `eprintln!` in Rust to output performance data to Shopify's function logs:

```rust
eprintln!("LogicFlow: {} rules evaluated in {}ms", rule_count, elapsed_ms);
eprintln!("LogicFlow: {} regex patterns evaluated", regex_count);
```

### **5.2 Metrics to Track**

| Metric                 | Collection Method | Alert Threshold   |
| ---------------------- | ----------------- | ----------------- |
| Execution time         | Function logs     | > 4ms             |
| Rules evaluated        | Function logs     | < expected count  |
| Regex evaluations      | Function logs     | > 30 per checkout |
| Time budget exceeded   | Function logs     | Any occurrence    |
| Metafield parse errors | Function logs     | Any occurrence    |

### **5.3 Shopify Partner Dashboard**

- Go to **Apps > LogicFlow > Extensions > [Function Name]**.
- **Run Details:** View STDOUT and STDERR logs from your Rust code.
- **Tip:** Use `eprintln!` liberally during development. These logs are essential for understanding why a rule didn't fire.

---

## **6. Debugging & Logs**

### **6.1 Common Issues**

| Symptom                   | Likely Cause          | Debug Steps                            |
| ------------------------- | --------------------- | -------------------------------------- |
| Rule doesn't fire         | Condition logic error | Check logs for rule evaluation path    |
| Checkout hangs            | Regex timeout         | Check for custom regex, review pattern |
| "No errors" when expected | Metafield not synced  | Verify metafield in GraphQL Explorer   |
| Random failures           | Time budget exceeded  | Check execution time in logs           |

### **6.2 Debug Mode**

Consider implementing a debug flag in the config:

```json
{
  "version": "1.1",
  "debug": true,
  "rules": [...]
}
```

When `debug: true`, the function outputs verbose logs for every condition evaluation.

---

## **7. User Acceptance Testing (UAT)**

Before launch, invite 3-5 "Beta" merchants.

### **7.1 UAT Tasks**

1. Ask them to recreate a complex script they used in `checkout.liquid`.
2. Observe if they struggle with the Logic Builder UI.
3. Have them use the "Test Your Cart" simulator.
4. Collect feedback on complexity budget visibility.

### **7.2 UAT Success Criteria**

| Metric                         | Target      |
| ------------------------------ | ----------- |
| Time to first rule             | < 2 minutes |
| Completion rate (without help) | > 80%       |
| NPS score                      | > 40        |
| "Would recommend"              | > 70%       |

### **7.3 UAT Feedback Form**

- How easy was it to create your first rule? (1-5)
- Did the complexity budget make sense? (Y/N)
- Did you try custom regex? What was your experience?
- What feature is missing that you need?
- Would you pay $49/mo for this? Why/why not?

---

## **8. Launch Checklist**

### **Pre-Launch (1 week before)**

- [ ] All P0 test scenarios passing
- [ ] Performance POC criteria met
- [ ] UAT feedback addressed
- [ ] Error monitoring configured
- [ ] Fail-open behavior verified

### **Launch Day**

- [ ] Deploy to production
- [ ] Monitor function logs for first 24 hours
- [ ] Check for execution time anomalies
- [ ] Verify App Store listing is live

### **Post-Launch (Week 1)**

- [ ] Review all function logs
- [ ] Check for pattern in support tickets
- [ ] Analyze complexity budget utilization across merchants
- [ ] Identify any regex patterns causing issues
