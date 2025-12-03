# Gatekeep Shopify App

Vertical slice implementation of the Gatekeep checkout validation engine.

## Prerequisites

1. **Shopify Partner Account** - [Create one here](https://partners.shopify.com/signup)
2. **Development Store** - Create a dev store with checkout extensibility enabled
3. **Node.js 18+** - Required for the Remix app
4. **Rust toolchain** - Required for the Shopify Function
5. **Shopify CLI** - Install with `npm install -g @shopify/cli@latest`

## Quick Start

### 1. Install Dependencies

```bash
cd apps/gatekeep/app
npm install
```

### 2. Set Up Prisma Database

```bash
npx prisma generate
npx prisma db push
```

### 3. Connect to Shopify

```bash
shopify app dev
```

This will:
- Prompt you to log in to your Shopify Partner account
- Create/select an app
- Connect to a development store
- Start the local development server

### 4. Deploy the Function

After the app is connected, deploy the function:

```bash
shopify app deploy
```

### 5. Enable the Function in Your Store

1. Go to your dev store's admin
2. Navigate to **Settings > Checkout > Checkout Rules**
3. Find "Gatekeep Validator" and enable it

### 6. Test It!

1. Open the Gatekeep app in your store's admin
2. Create a simple rule (e.g., "Block if cart total > $100")
3. Save the rule
4. Go to your storefront, add items to cart
5. Try to checkout — you should see your error message!

## Project Structure

```
app/
├── app/
│   ├── routes/
│   │   ├── app._index.tsx    # Main UI for creating rules
│   │   └── app.tsx           # App layout with navigation
│   ├── shopify.server.ts     # Shopify client setup
│   └── db.server.ts          # Prisma database client
├── extensions/
│   └── gatekeep-validator/  # Shopify Function (Rust)
│       ├── src/
│       │   ├── lib.rs        # Main function entry
│       │   ├── evaluator.rs  # Rule evaluation engine
│       │   └── patterns.rs   # Pre-built regex patterns
│       ├── Cargo.toml
│       └── shopify.extension.toml
├── prisma/
│   └── schema.prisma         # Database schema (sessions)
├── package.json
└── shopify.app.toml          # App configuration
```

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Admin UI (Remix)                                           │
│  - Merchant creates rules                                   │
│  - Rules saved to app metafield as JSON                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Shopify Metafield                                          │
│  namespace: "gatekeep"                                     │
│  key: "rules_config"                                        │
│  value: { rules: [...] }                                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Shopify Function (Rust/WASM)                               │
│  - Runs at checkout validation                              │
│  - Reads rules from metafield                               │
│  - Evaluates conditions against cart                        │
│  - Returns errors to block checkout                         │
└─────────────────────────────────────────────────────────────┘
```

### Rule Format

Rules are stored as JSON in the metafield:

```json
{
  "version": "1.0",
  "rules": [
    {
      "id": "rule_1",
      "name": "Max Cart Total",
      "enabled": true,
      "error_message": "Cart total cannot exceed $1000",
      "conditions": {
        "operator": "AND",
        "criteria": [
          {
            "field": "cart.total",
            "operator": "GREATER_THAN",
            "value": 1000
          }
        ]
      }
    }
  ]
}
```

### Available Fields

| Field | Type | Description |
|-------|------|-------------|
| `cart.total` | Number | Total cart value |
| `cart.subtotal` | Number | Subtotal before shipping/tax |
| `cart.quantity` | Number | Total items in cart |
| `shipping_address.country_code` | String | e.g., "US", "CA", "GB" |
| `shipping_address.province_code` | String | e.g., "CA", "NY", "ON" |
| `shipping_address.zip` | String | Postal/ZIP code |
| `shipping_address.address1` | String | Street address |
| `customer.tags` | Array | Customer tags |

### Available Operators

| Operator | Description |
|----------|-------------|
| `EQUALS` | Exact match |
| `NOT_EQUALS` | Does not match |
| `GREATER_THAN` | Numeric greater than |
| `LESS_THAN` | Numeric less than |
| `CONTAINS` | String contains substring |
| `STARTS_WITH` | String starts with |
| `REGEX_MATCH` | Regex pattern match |

## Development

### Run locally

```bash
shopify app dev
```

### View function logs

After deploying, view function execution logs:

```bash
shopify app function logs --name=gatekeep-validator
```

Or in the Partner Dashboard:
**Apps > Gatekeep > Extensions > gatekeep-validator > Logs**

### Build function manually

```bash
cd extensions/gatekeep-validator
cargo wasi build --release
```

## Troubleshooting

### "No rules config found" in logs

The metafield hasn't been created yet. Save a rule in the admin UI.

### Function not appearing in Checkout Rules

Make sure you ran `shopify app deploy` after making changes to the function.

### Rules not blocking checkout

1. Check function logs for errors
2. Verify the rule is `enabled: true`
3. Ensure the condition matches your test cart

## Next Steps

After validating the vertical slice:

1. **Build full UI** - Visual rule builder with complexity meter
2. **Add more fields** - Line items, product tags, etc.
3. **Add scheduling** - Enable rules for specific dates
4. **Add analytics** - Track how often rules fire

