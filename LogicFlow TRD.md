# **Technical Requirements Document (TRD): LogicFlow**

Product: LogicFlow  
Tech Stack: Node.js (Backend), React (Frontend), Rust (Shopify Function), GraphQL (API).

## **1\. System Architecture**

The system follows a **Configuration-Execution Split** pattern to maintain performance and flexibility.

### **High-Level Diagram**

1. **Merchant UI (Polaris/React):** User defines rules visually.  
2. **Compiler (Node.js API):** Receives UI data \-\> Validates structure \-\> Serializes into optimized JSON.  
3. **Storage (Shopify Metafields):** The JSON is stored in a logicflow--config App Metafield attached to the Shop.  
4. **Runtime (Rust/WASM):** The Shopify Function runs at checkout. It fetches the Metafield, parses the JSON, and iterates through rules.

## **2\. Data Model (The "Rules" JSON)**

To ensure the WASM function is fast, the Metafield data must be lightweight.

Metafield Key: app\_data.rules\_config  
Schema Structure (JSON):  
{  
  "version": "1.0",  
  "rules": \[  
    {  
      "id": "rule\_123",  
      "name": "Block PO Boxes",  
      "error\_message": "We do not ship to PO Boxes.",  
      "conditions": {  
        "operator": "AND",  
        "criteria": \[  
          {  
            "field": "delivery\_address.address1",  
            "operator": "REGEX\_MATCH",  
            "value": "(?i)box"   
          },  
          {  
            "field": "cart.total\_weight",  
            "operator": "GREATER\_THAN",  
            "value": 5000  
          }  
        \]  
      }  
    }  
  \]  
}

## **3\. Component Specifications**

### **3.1 The Compiler (Node.js Backend)**

* **Role:** Integrity check. Ensure users don't save broken Regex or circular logic.  
* **API:** Use Shopify Admin GraphQL API to write the JSON to metafieldsSet.  
* **Framework:** Remix (using @shopify/shopify-app-remix).

### **3.2 The Runtime Function (Rust)**

* **Input:** run.graphql must query the Shop Metafield AND Cart data.  
* **Performance Constraint:** The function has a strict memory and execution time limit (Time-to-First-Byte constraints for checkout).  
  * *Optimization:* Use serde\_json for zero-copy parsing if possible.  
  * *Limit:* Cap the number of rules processed to \~50 to prevent timeout, or implement "early exit" logic.  
* **Logic:**  
  1. Parse input.shop.metafield.value.  
  2. Iterate rules.  
  3. Evaluate conditions against input.cart.  
  4. If Match \-\> Push FunctionError to output vector.

### **3.3 The Frontend (React \+ Polaris)**

* **Library:** @shopify/polaris for UI components.  
* **State Management:** React Hook Form for handling the complex rule builder form.  
* **Preview:** Real-time visual representation of the logic flow.

## **4\. API & Integration Requirements**

* **Shopify Functions API:** Target cart-checkout-validation extension point.  
* **Permissions:** write\_products (if tagging), read\_orders, write\_pixels (for analytics), read\_metaobjects.

## **5\. Security & Limitations**

* **Data Privacy:** No PII (Personally Identifiable Information) should be stored in the Rules Config Metafield. The function reads PII (address) at runtime but does not store it.  
* **Latency:** The Metafield fetch adds a small overhead. Ensure the GraphQL query is optimized to fetch only necessary fields.