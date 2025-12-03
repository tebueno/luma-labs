# Gatekeep Developer Setup Guide

## Prerequisites

### 1. Node.js & npm

```bash
node --version  # Should be >= 18.0.0
npm --version
```

### 2. Rust & Cargo

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Verify
rustc --version
cargo --version
```

### 3. WASM Target & Tools

```bash
# Add the WASM target (note: wasm32-wasi is deprecated, use wasip1)
rustup target add wasm32-wasip1

# Install cargo-wasi for easier WASM builds
cargo install cargo-wasi
```

### 4. Shopify CLI

```bash
npm install -g @shopify/cli@latest

# Verify
shopify version
```

### 5. Shopify Partner Account

- Create account at [partners.shopify.com](https://partners.shopify.com)
- Create a development store for testing

---

## Project Setup

### 1. Clone & Install

```bash
cd apps/gatekeep/app
npm install
```

### 2. Configure Prisma (Session Storage)

```bash
npx prisma generate
npx prisma db push
```

### 3. Link to Shopify

```bash
# This creates/links the app and generates credentials
shopify app dev --reset
```

When prompted:

- Select your organization
- Create a new app OR select existing "Gatekeep"
- Select your development store

---

## Running the App

### Development Mode

```bash
cd apps/gatekeep/app
shopify app dev
```

This starts:

- **Vite dev server** - Hot-reloading React/Remix app
- **Cloudflare tunnel** - Exposes your local app to Shopify
- **Function watcher** - Rebuilds Rust WASM on changes

### Keyboard Shortcuts (while running)

- `p` - Open app preview in browser
- `g` - Open GraphiQL (Admin API)
- `q` - Quit

---

## Project Structure

```
apps/gatekeep/app/
├── app/                          # Remix application
│   ├── routes/
│   │   ├── app._index.tsx        # Main rule builder UI (slim orchestrator)
│   │   ├── app.tsx               # App layout with nav
│   │   └── auth.$.tsx            # OAuth handling
│   ├── lib/
│   │   └── rules/                # Rule management modules
│   │       ├── types.ts          # TypeScript interfaces
│   │       ├── constants.ts      # Field/operator options
│   │       ├── utils.ts          # Helpers (complexity, summaries)
│   │       ├── hooks.ts          # React hooks (useRuleForm, etc.)
│   │       ├── graphql.server.ts # Admin API helpers
│   │       └── components/       # UI components
│   │           ├── RuleList.tsx
│   │           ├── RuleModal.tsx
│   │           ├── ConditionBuilder.tsx
│   │           ├── ConditionRow.tsx
│   │           ├── DeleteModal.tsx
│   │           └── StatusSidebar.tsx
│   ├── shopify.server.ts         # Shopify app configuration
│   └── db.server.ts              # Prisma client
├── extensions/
│   └── gatekeep-validator/      # Shopify Function (Rust)
│       ├── src/
│       │   ├── lib.rs            # Function entry point & evaluator
│       │   └── run.graphql       # Input query (cart + shop metafield)
│       ├── Cargo.toml            # Rust dependencies
│       └── shopify.extension.toml
├── shopify.app.toml              # App configuration
├── shopify.web.toml              # Web process configuration
└── vite.config.ts                # Vite configuration
```

---

## Key Configuration Files

### shopify.web.toml

Tells Shopify CLI how to run the web app:

```toml
[commands]
dev = "npm exec -- remix vite:dev"
build = "npm run build"

[roles]
frontend = true
backend = true
```

### shopify.extension.toml

Configures the Shopify Function:

```toml
api_version = "2025-01"

[[extensions]]
name = "Gatekeep Validator"
handle = "gatekeep-validator"
type = "function"

  [extensions.build]
  command = "cargo build --target wasm32-wasip1 --release"
  path = "target/wasm32-wasip1/release/gatekeep-validator.wasm"

  [[extensions.targeting]]
  target = "purchase.validation.run"
  input_query = "src/run.graphql"
```

### vite.config.ts

Must include these settings for Shopify CLI compatibility:

```typescript
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
    allowedHosts: true, // Allow tunnel hosts
    hmr: {
      port: Number(process.env.HMR_SERVER_PORT) || 3001,
    },
  },
  // ... plugins
});
```

---

## Verifying the Setup

### 1. Check Function Builds

Watch the terminal for:

```
gatekeep-validator │ Building function gatekeep-validator...
gatekeep-validator │ Finished `release` profile [optimized]
```

### 2. Check Web App Loads

Press `p` or go to:

```
https://admin.shopify.com/store/YOUR-STORE/apps/gatekeep
```

### 3. Check Function Runs at Checkout

Go to checkout in your dev store. Terminal should show:

```
gatekeep-validator │ Function export "null" executed successfully
gatekeep-validator │ │ Gatekeep: Evaluated X rules, Y errors
```

---

## Common Issues

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for solutions to common problems.
