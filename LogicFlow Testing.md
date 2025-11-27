# **Quality Assurance & Testing Strategy: LogicFlow**

## **1\. Testing Environment Setup**

Testing Shopify Functions requires a specific environment setup because functions run on Shopify's infrastructure, not your local server.

### **Prerequisites**

1. **Shopify CLI 3.x:** Ensure you are running the latest version (npm install \-g @shopify/cli).  
2. **Development Store:** You must use a Development Store with **Checkout Extensibility Preview** enabled. (Standard dev stores may not support all function features yet).  
3. **Rust Toolchain:** Ensure cargo and wasi targets are installed for compiling the function.

## **2\. Testing Levels**

### **Level 1: Unit Testing (Rust)**

Test the logic *locally* without deploying to Shopify.

* **Tool:** cargo test  
* **Method:** Create mock Input structs (simulating a cart) and pass them to your run() function.  
* **Scenarios to Cover:**  
  * Empty Rule Set (Should return no errors).  
  * Single Rule Match (Should return specific error).  
  * Regex Failures (Test invalid regex patterns).  
  * Boundary Values (e.g., Cart total exactly $100 vs $100.01).

### **Level 2: Integration Testing (The Compiler)**

Test if the UI correctly saves data to the Metafield.

* **Action:** Create a rule in the UI \-\> Save.  
* **Verification:** Use Shopify Admin GraphQL Explorer (or an app like "Metafields Guru") to inspect the shop resource.  
* **Check:** Is the JSON valid? Are special characters escaped correctly?

### **Level 3: End-to-End (E2E) in Shopify Checkout**

This is the critical step to verify the "User Experience" at checkout.

**Step-by-Step E2E Guide:**

1. **Deploy:** Run shopify app deploy. This pushes the WASM binary to Shopify.  
2. **Enable:** Go to **Settings \> Checkout \> Checkout Rules** in your Dev Store. You should see "LogicFlow" listed. Add it.  
3. **Configure:** Open the LogicFlow App Admin. Create a rule: *"Block if Total \> $1000"*.  
4. **Simulate:**  
   * Open your Online Store storefront.  
   * Add items totaling $1500 to the cart.  
   * Proceed to Checkout.  
   * **Expected Result:** You should be blocked from paying. The error message defined in LogicFlow should appear near the "Pay Now" button or the specific field.  
5. **Modify & Retry:**  
   * Go back to the App. Change the limit to $2000. Save.  
   * Refresh Checkout.  
   * **Expected Result:** You should now be able to proceed. (This confirms the Metafield instant-update mechanism works).

## **3\. Specific Test Scenarios for LogicFlow**

| Scenario ID | Test Case | Expected Outcome |
| :---- | :---- | :---- |
| **LF-01** | **The "5-Function" Bypass** | Create 6 distinct rules in LogicFlow (e.g., Block PO Box, Max Qty, Min Price, etc.). Trigger all of them. |
| **LF-02** | **Regex Complexity** | create a rule blocking "UK Postcodes" using Regex. Enter a valid UK code. |
| **LF-03** | **Performance Load** | Create 50 active rules. Enter checkout. |
| **LF-04** | **Line Item Properties** | Add a product with a custom property Engraving: BadWord. Rule blocks profanity. |

## **4\. Debugging & Logs**

* **Shopify Partner Dashboard:** Go to **Apps \> LogicFlow \> Extensions \> \[Function Name\]**.  
* **Run Details:** You can see the STDOUT and STDERR logs from your Rust code here.  
* **Tip:** Use eprintln\! in Rust to print debug variables to these logs. They are essential for understanding why a rule didn't fire.

## **5\. User Acceptance Testing (UAT)**

Before launch, invite a "Beta" merchant.

* Ask them to recreate a complex script they used in checkout.liquid.  
* Observe if they struggle with the Logic Builder UI.