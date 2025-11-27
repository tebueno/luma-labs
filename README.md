# Luma Labs

A monorepo housing e-commerce applications for Shopify, Wix, Webflow, and other platforms.

## Apps

| App | Platform | Status | Description |
|-----|----------|--------|-------------|
| [LogicFlow](./apps/logicflow/) | Shopify | 🔬 POC | Visual checkout validation rule builder for Shopify Plus |

## Repository Structure

```
luma-labs/
├── apps/
│   └── [app-name]/
│       ├── README.md       # App overview
│       ├── docs/           # PRD, TRD, etc.
│       └── src/            # Source code
└── docs/                   # Shared documentation (future)
```

## Getting Started

Each app is self-contained with its own README and documentation. Navigate to the app folder for specific setup instructions.

### Prerequisites

- Node.js 18+
- Rust toolchain (for Shopify Functions)
- Shopify CLI 3.x (for Shopify apps)

## Adding a New App

1. Create a new folder under `apps/[app-name]/`
2. Add a README.md with project overview
3. Add docs folder with PRD, TRD, etc.
4. Update this README's app table

## License

Proprietary - All rights reserved.

