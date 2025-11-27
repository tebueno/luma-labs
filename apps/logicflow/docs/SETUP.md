# LogicFlow Developer Setup Guide

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
cd apps/logicflow/app
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
- Create a new app OR select existing "LogicFlow"
- Select your development store

---

## Running the App

### Development Mode

```bash
cd apps/logicflow/app
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
apps/logicflow/app/
├── app/                          # Remix application
│   ├── routes/
│   │   ├── app._index.tsx        # Main rule builder UI
│   │   ├── app.tsx               # App layout
│   │   └── auth.$.tsx            # OAuth handling
│   ├── shopify.server.ts         # Shopify app configuration
│   └── db.server.ts              # Prisma client
├── extensions/
│   └── logicflow-validator/      # Shopify Function (Rust)
│       ├── src/
│       │   ├── main.rs           # Function entry point
│       │   ├── evaluator.rs      # Rule evaluation logic
│       │   └── patterns.rs       # Pattern matching
│       ├── Cargo.toml            # Rust dependencies
│       └── shopify.extension.toml
├── shopify.app.logicflow.toml    # App configuration
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
name = "LogicFlow Validator"
handle = "logicflow-validator"
type = "function"

  [extensions.build]
  command = "cargo build --target wasm32-wasip1 --release"
  path = "target/wasm32-wasip1/release/logicflow-validator.wasm"

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
logicflow-validator │ Building function logicflow-validator...
logicflow-validator │ Finished `release` profile [optimized]
```

### 2. Check Web App Loads

Press `p` or go to:

```
https://admin.shopify.com/store/YOUR-STORE/apps/logicflow
```

### 3. Check Function Runs at Checkout

Go to checkout in your dev store. Terminal should show:

```
logicflow-validator │ Function export "null" executed successfully
logicflow-validator │ │ LogicFlow: Evaluated X rules, Y errors
```

---

## Common Issues

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for solutions to common problems.
