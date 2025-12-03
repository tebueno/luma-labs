# Gatekeep

**The Checkout Validation App for Shopify Plus**

Gatekeep is a no-code rule builder that enables Shopify Plus merchants to create checkout validation rules and test them before they go live. It consolidates multiple validation rules into a single Shopify Function, bypassing the platform's 5-function limit.

## Status: Vertical Slice

POC validated (0.08ms for 50 rules + 5 regex). Now building end-to-end Shopify app.

## The Problem

1. **Checkout.liquid Deprecation**: Shopify is deprecating checkout.liquid in August 2025, forcing merchants to migrate to Shopify Functions.

2. **5-Function Limit**: Shopify limits stores to 5 active validation functions. Merchants with complex needs hit this ceiling immediately.

3. **Technical Barrier**: Shopify Functions require Rust/WASM development, which is inaccessible to most merchants.

## The Solution

Gatekeep provides:

- **Visual Rule Builder**: Drag-and-drop interface for creating validation logic
- **One Function Architecture**: All rules compile to a single Shopify Function
- **Pre-built Patterns**: Curated regex library for common validations (PO Box, postcodes, etc.)
- **Complexity Budget**: Transparent performance limits with real-time feedback

## Documentation

| Document | Description |
|----------|-------------|
| [PRD](./docs/PRD.md) | Product requirements and feature specifications |
| [TRD](./docs/TRD.md) | Technical architecture and implementation details |
| [Testing](./docs/TESTING.md) | QA strategy and test scenarios |
| [POC Plan](./docs/POC-PLAN.md) | 5-day proof-of-concept implementation guide |

## Project Structure

```
gatekeep/
├── README.md               # This file
├── docs/                   # Documentation
│   ├── PRD.md              # Product Requirements
│   ├── TRD.md              # Technical Requirements
│   ├── TESTING.md          # Testing Strategy
│   └── POC-PLAN.md         # POC Implementation Plan
├── poc/                    # Proof of Concept (standalone Rust benchmarks)
│   ├── Cargo.toml
│   ├── src/
│   └── benches/
└── app/                    # Shopify App (Vertical Slice)
    ├── README.md           # App setup instructions
    ├── app/                # Remix frontend
    │   └── routes/
    ├── extensions/         # Shopify Function
    │   └── gatekeep-validator/
    ├── prisma/             # Database schema
    └── package.json
```

## Quick Start

### Option 1: Run the Shopify App (Vertical Slice)

See [app/README.md](./app/README.md) for full setup instructions.

```bash
cd app
npm install
npx prisma generate
shopify app dev
```

### Option 2: Run POC Benchmarks

```bash
cd poc
cargo test --release
cargo bench
```

### POC Benchmark Results

| Scenario | Target | Actual |
|----------|--------|--------|
| 50 simple rules | <2ms | 0.008ms ✅ |
| 50 rules + 5 regex | <4ms | 0.08ms ✅ |
| JSON parsing (50 rules) | <0.5ms | 0.07ms ✅ |

## Pricing Tiers (Planned)

| Plan | Price | Complexity Budget |
|------|-------|-------------------|
| Starter | $19/mo | 25 points (~10-15 rules) |
| Growth | $49/mo | 100 points (~40-50 rules) |
| Plus | $149/mo | 250 points (~100 rules) |

## Roadmap

- **Phase 1 (MVP)**: March 2025 - Visual builder, basic validation
- **Phase 2**: May 2025 - Custom regex, simulator, analytics
- **Phase 3**: July 2025 - Templates, scheduling, versioning
- **Phase 4**: Post-launch - Multi-store sync, agency tools

## Tech Stack

- **Frontend**: React + Polaris (Shopify design system)
- **Backend**: Node.js + Remix
- **Function**: Rust compiled to WASM
- **Storage**: Shopify Metafields

## License

Proprietary - All rights reserved.

