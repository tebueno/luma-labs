# LogicFlow Troubleshooting Guide

Common issues encountered during development and their solutions.

---

## Build Errors

### ❌ `error: no such command: wasi`

**Cause:** The `cargo-wasi` tool is not installed.

**Solution:**
```bash
cargo install cargo-wasi
```

---

### ❌ `error: target wasm32-wasi is deprecated`

**Cause:** Rust deprecated `wasm32-wasi` in favor of `wasm32-wasip1`.

**Solution:**
```bash
# Add the new target
rustup target add wasm32-wasip1
```

Also update `shopify.extension.toml`:
```toml
[extensions.build]
command = "cargo build --target wasm32-wasip1 --release"
path = "target/wasm32-wasip1/release/logicflow-validator.wasm"
```

---

### ❌ `Wasm file size must be less than 256KB`

**Cause:** The compiled WASM binary exceeds Shopify's size limit. Usually caused by heavy dependencies like `regex`.

**Solution:**
1. Remove or replace heavy crates
2. Use `regex-lite` instead of `regex` (if regex is needed)
3. For the vertical slice, we use simple string matching instead:

```rust
// Instead of regex
pub fn is_po_box(text: &str) -> bool {
    let lower = text.to_lowercase();
    lower.contains("po box") || lower.contains("p.o. box")
}
```

Optimize `Cargo.toml`:
```toml
[profile.release]
lto = true
opt-level = "z"    # Optimize for size
strip = true
codegen-units = 1
```

---

### ❌ `failed to find function export _start`

**Cause:** Using `cdylib` crate type which doesn't generate `_start` for WASM.

**Solution:**
Change `Cargo.toml` from library to binary:
```toml
# Remove this:
# [lib]
# crate-type = ["cdylib"]

# Add this:
[[bin]]
name = "logicflow-validator"
path = "src/main.rs"
```

---

### ❌ `Expected array, received object` (targeting section)

**Cause:** TOML syntax error in `shopify.extension.toml`.

**Solution:**
Use double brackets for array items:
```toml
# Wrong:
[extensions.targeting]
target = "purchase.validation.run"

# Correct:
[[extensions.targeting]]
target = "purchase.validation.run"
```

---

## Web App Errors

### ❌ `Using URL: https://shopify.dev/apps/default-app-home`

**Cause:** Missing `shopify.web.toml` file, so CLI doesn't know how to run the web app.

**Solution:**
Create `shopify.web.toml` in the app root:
```toml
[commands]
dev = "npm exec -- remix vite:dev"
build = "npm run build"

[roles]
frontend = true
backend = true
```

---

### ❌ `Blocked request. This host is not allowed`

**Cause:** Vite is blocking the Cloudflare tunnel hostname.

**Solution:**
Add to `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    allowedHosts: true,
    // ...
  },
});
```

---

### ❌ `Detected an empty appUrl configuration`

**Cause:** Environment variables not passed to Vite correctly.

**Solution:**
1. Update `vite.config.ts` to read PORT from env:
```typescript
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
    // ...
  },
});
```

2. Add fallbacks in `shopify.server.ts`:
```typescript
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY || "YOUR_CLIENT_ID",
  appUrl: process.env.SHOPIFY_APP_URL || process.env.HOST || "https://localhost:3000",
  // ...
});
```

---

### ❌ `Detected call to authenticate.admin() from login path`

**Cause:** The auth route is calling `authenticate.admin()` for the login path.

**Solution:**
Update `auth.$.tsx`:
```typescript
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  
  if (url.pathname === "/auth/login") {
    return login(request);  // Use login() not authenticate()
  }
  
  await authenticate.admin(request);
  return json({});
};
```

---

### ❌ ESM/CJS compatibility errors with vite-tsconfig-paths

**Cause:** Package type mismatch.

**Solution:**
Add to `package.json`:
```json
{
  "type": "module"
}
```

---

## Metafield Errors

### ❌ `ApiPermission metafields can only be created by app owner`

**Cause:** Using incorrect `ownerId` when saving metafields.

**Solution:**
Query the correct owner ID before saving:
```typescript
// Get shop ID
const shopResponse = await admin.graphql(`
  query GetShop {
    shop { id }
  }
`);
const shopData = await shopResponse.json();
const ownerId = shopData.data?.shop?.id;

// Use it in mutation
metafieldsSet(metafields: [{
  namespace: "logicflow",
  key: "rules_config",
  ownerId: ownerId,  // Not AppInstallation ID
  // ...
}])
```

---

### ❌ `No rules config found in metafield` (function logs)

**Cause:** Function is querying the wrong metafield location.

**Background:** 
- App saves to: `AppInstallation` metafield (default)
- Function reads from: `validation.metafield` or `shop.metafield`

**Solution:**
Both must use the same location. We chose **Shop metafield**:

1. **run.graphql** - Query from shop:
```graphql
query Input {
  cart { ... }
  shop {
    metafield(namespace: "logicflow", key: "rules_config") {
      value
    }
  }
}
```

2. **main.rs** - Read from shop:
```rust
struct Input {
    cart: Cart,
    shop: Option<Shop>,  // Not validation
}
```

3. **app._index.tsx** - Save to shop:
```typescript
const shopResponse = await admin.graphql(`query { shop { id } }`);
const ownerId = shopData.data?.shop?.id;
// Use ownerId in metafieldsSet
```

---

## Debugging Tips

### View Function Logs
Watch the terminal running `shopify app dev` for function output:
```
logicflow-validator │ │ LogicFlow: Evaluated 1 rules, 1 errors
```

### Check Metafield Contents
Press `g` to open GraphiQL, then run:
```graphql
query {
  shop {
    metafield(namespace: "logicflow", key: "rules_config") {
      id
      value
    }
  }
}
```

### Verify Function is Enabled
1. Go to Shopify Admin → Settings → Checkout
2. Look for "Checkout rules" or "Validation"
3. Ensure LogicFlow Validator is enabled

