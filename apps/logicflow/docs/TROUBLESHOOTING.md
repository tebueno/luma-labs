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

---

## Customer Tags Limitation

### The Problem

Shopify Functions use **static GraphQL queries** compiled into the WASM binary at build time. For customer tags, this means:

```graphql
# This query is FROZEN when you deploy
hasTags(tags: ["vip", "wholesale", "blacklist", ...])
```

You **cannot** dynamically query "whatever tags the merchant configured." The tags must be specified in code before deployment.

### Current Implementation (Option D)

We ship with 30 pre-defined common tags:

**Customer tier:** `vip`, `wholesale`, `retail`, `b2b`, `preferred`, `premium`, `gold`, `silver`, `bronze`

**Risk/security:** `blacklist`, `blocked`, `fraud`, `suspicious`, `review`

**Internal/testing:** `test`, `staff`, `employee`, `internal`

**Marketing:** `newsletter`, `beta`, `loyalty`, `referral`

**Business type:** `corporate`, `enterprise`, `partner`, `reseller`, `distributor`

If a merchant uses a tag not in this list:
- The UI shows a warning: "Tag not in supported list"
- The rule will NOT work at checkout
- Contact support to add the tag and redeploy

### Adding Custom Tags (Developer)

1. Add tag to `apps/logicflow/app/extensions/logicflow-validator/src/run.graphql`:
   ```graphql
   hasTags(tags: ["vip", ..., "NEW_TAG_HERE"])
   ```

2. Add tag to `apps/logicflow/app/app/lib/rules/evaluator.ts`:
   ```typescript
   export const SUPPORTED_CUSTOMER_TAGS = [
     // ...existing tags
     "new_tag_here",
   ] as const;
   ```

3. Deploy: `shopify app deploy`

---

## Alternative Approaches (Future Consideration)

### Option A: Remove Customer Tags Feature
- Remove `customer.tags` from field options
- Focus on cart/address fields which work dynamically
- **Pros:** No limitations to explain
- **Cons:** Loses valuable use case

### Option B: Merchant-Triggered Rebuild
- When merchant saves a rule with new tag → show "Deploy Required" button
- Button triggers function rebuild with their custom tags
- **Pros:** Full flexibility
- **Cons:** Bad UX, slow (rebuild takes ~30s), complex infrastructure

### Option C: Customer Metafields Instead of Tags
- Query a customer metafield we control:
  ```graphql
  customer {
    metafield(namespace: "logicflow", key: "flags") {
      value  # JSON: ["vip", "custom-tag", ...]
    }
  }
  ```
- Merchant syncs their tags to this metafield via Shopify Flow or API
- **Pros:** Fully dynamic
- **Cons:** Requires merchant to set up sync, not using native tags

### Option D: Accept Limitation (Current)
- Ship with 30 common tags
- Document the limitation
- Add custom tags on request
- **Pros:** Simple, works for most cases
- **Cons:** Not fully self-service

---

## Why Shopify Does This

Shopify Functions run in a sandboxed WASM environment with strict performance requirements (<5ms execution). Static queries allow Shopify to:
1. Optimize data fetching before function runs
2. Validate queries at compile time
3. Ensure predictable performance

This is a platform limitation, not a LogicFlow limitation.

