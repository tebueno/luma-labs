# **Product Requirements Document (PRD): LogicFlow**

Version: 1.1  
Status: Draft  
Product Name: LogicFlow (Working Title)  
Tagline: The Visual Checkout Validation Engine for Shopify Plus.

## **1. Executive Summary**

LogicFlow is a "No-Code" Visual Rule Builder designed to solve the "Extensibility Crisis" for Shopify Plus merchants. With the deprecation of checkout.liquid in August 2025, merchants must migrate to Shopify Functions. However, Shopify Functions require complex coding (Rust/WASM) and have a strict limit of 5 active validation apps per store.

LogicFlow solves this by acting as a single container for **consolidated validation rules**. It decouples the definition of logic (visual UI) from the execution (single optimized WASM function), allowing merchants to enforce complex business rules without hitting platform limits or hiring developers.

## **2. Problem Statement**

- **The Technical Barrier:** Non-technical merchants cannot replicate their old checkout.liquid scripts (e.g., "Block PO Boxes") using the new Shopify Functions architecture without writing code.
- **The 5-Function Limit:** Shopify limits stores to 5 active validation functions. A merchant needing age verification, address validation, quantity limits, and fraud checks will hit this ceiling immediately.
- **The Usability Gap:** There is no native visual builder for Checkout Validation in the Shopify Admin.

## **3. Goals & Success Metrics**

- **Primary Goal:** Enable merchants to create complex AND/OR validation logic without writing a single line of code.
- **Technical Goal:** Consolidate many rules into a single Shopify Function execution to bypass the 5-app limit while staying within Shopify's 5ms execution budget.
- **Business Goal:** Reach $5k MRR within 6 months by targeting the checkout migration deadline.
- **Key Performance Indicators (KPIs):**
  - Time-to-First-Rule: User creates and saves a rule in < 2 minutes.
  - Function Execution Time: Must remain under 4ms (with 1ms buffer) regardless of rule complexity.
  - Complexity Budget Utilization: Average merchant uses <60% of their plan's budget.

## **4. User Personas**

- **The Operations Manager (Primary):** Non-technical. Needs to stop shipping to Hawaii because shipping costs are too high. Wants a "Zapier-like" interface.
- **The Agency Developer (Secondary):** Technical but overwhelmed. Needs a tool to rapidly migrate 20+ clients off checkout.liquid without writing custom Rust code for every edge case.

## **5. Feature Requirements**

### **5.1 The Visual Rule Builder (Core)**

- **Drag-and-Drop Interface:** Users can select triggers and actions.
- **Logic Gates:** Support for nested AND / OR conditions.
- **Complexity Budget Meter:** Real-time display showing "X of Y complexity points used" as users build rules.
- **Trigger Variables:**
  - Cart Total (Amount, Quantity, Weight)
  - Customer Tags (e.g., VIP, Wholesale, Blacklist)
  - Shipping Address (Zip Code, Country, PO Box detection)
  - Line Items (Product Vendor, SKU, Properties/Metafields)
- **Actions:**
  - Block Checkout (Prevent payment)
  - Display Error Message (Customizable localized text)

### **5.2 The "One Function" Architecture**

- **Consolidation:** The app must deploy only **one** Shopify Function extension.
- **Configuration:** All rules created in the UI must be compiled into a single JSON configuration object stored in a Shop Metafield.

### **5.3 The Complexity Points System**

Rules consume "complexity points" based on their computational cost. This ensures honest marketing and predictable performance.

| Rule Type                   | Points       | Examples                                |
| --------------------------- | ------------ | --------------------------------------- |
| Numeric comparison          | 1            | `cart.total > 100`, `cart.quantity < 5` |
| Tag/string equals           | 1            | `customer.tag == "VIP"`                 |
| String contains/starts with | 2            | `address.city contains "New"`           |
| Nested AND/OR               | +1 per level | Each nesting depth adds 1 point         |
| Pre-built regex pattern     | 3            | PO Box detection, UK postcode           |
| Custom regex (Growth+ only) | 5            | User-defined patterns                   |

### **5.4 Regex Library (Curated & Safe)**

- **Pre-built Patterns:** Verified, performance-tested Regular Expressions for common needs:
  - PO Box Detection
  - UK/US/CA Postcode formats
  - Email validation (basic)
  - Phone number formats
  - Profanity filter (word list)
- **Custom Regex (Growth+ tiers):** Users can write custom patterns, subject to:
  - Compile-time complexity validation
  - Performance benchmarking before save
  - Warning if pattern approaches unsafe complexity

### **5.5 Line Item Property Inspection**

- Ability to validate custom form data (e.g., "If 'Engraving' contains profanity, block checkout").

### **5.6 "Test Your Cart" Simulator**

- **Requirement:** An in-admin sandbox where the merchant can build a mock cart and run their active rules against it to see pass/fail results without placing a real order.
- **Performance Display:** Show estimated execution time for the test run.

## **6. Pricing Strategy**

Pricing is based on **Complexity Budget**, not arbitrary rule counts.

| Plan        | Price   | Complexity Budget | Features                                              |
| ----------- | ------- | ----------------- | ----------------------------------------------------- |
| **Starter** | $19/mo  | 25 points         | ~10-15 simple rules, Pre-built regex only             |
| **Growth**  | $49/mo  | 100 points        | ~40-50 simple rules, Custom regex, Simulator          |
| **Plus**    | $149/mo | 250 points        | ~100 simple rules, Multi-store sync, Priority Support |

**Overage Handling:** If a merchant exceeds their budget, they cannot save new rules until they upgrade or optimize existing rules.

## **7. Competitive Positioning**

| Competitor               | Weakness                                     | LogicFlow Advantage                          |
| ------------------------ | -------------------------------------------- | -------------------------------------------- |
| King Checkout Validation | Fragmented feature set, multiple apps needed | All rule types in one app, one function slot |
| Nex Checkout Validator   | List-based UI, limited logic complexity      | Visual flow builder for complex AND/OR logic |
| Custom Agency Code       | $5k+ upfront, requires maintenance           | $49/mo, no code, instant updates             |

## **8. Platform Risk & Mitigation**

**Risk:** Shopify could build native visual tooling for Functions.

**Assessment:** Low-Medium. Shopify builds platforms, not solutions. No beta announcements as of Nov 2025. Shopify Flow exists but doesn't cover checkout validation.

**Mitigation Strategy:**

1. **Speed to market:** Ship MVP by Q1 2025 to capture merchants before deadline.
2. **Template library moat:** Pre-built "one-click" rules create switching costs.
3. **Agency partnerships:** If agencies standardize on LogicFlow, ecosystem lock-in provides protection.

## **9. Roadmap**

### **Phase 1 (MVP) - Target: March 2025**

- Visual Rule Builder with complexity budget
- Metafield Sync
- Basic Address & Cart Validation (numeric, tag, string comparisons)
- Pre-built regex patterns (PO Box, Postcodes)

### **Phase 2 - Target: May 2025**

- Custom Regex support (with safety validation)
- "Test Your Cart" Simulator
- Rule performance analytics ("This rule blocked 47 checkouts this month")

### **Phase 3 - Target: July 2025**

- Template Library ("One-click PO Box Block", "Wholesale Minimum Order")
- Rule scheduling ("Enable only during Black Friday")
- Rule versioning & rollback
- Audit log (who changed what, when)

### **Phase 4 - Post-Launch**

- Multi-store sync (dev-to-prod deployment)
- Agency white-label dashboard
