# **Product Requirements Document (PRD): LogicFlow**

Version: 1.0  
Status: Draft  
Product Name: LogicFlow (Working Title)  
Tagline: The Visual Checkout Validation Engine for Shopify Plus.

## **1\. Executive Summary**

LogicFlow is a "No-Code" Visual Rule Builder designed to solve the "Extensibility Crisis" for Shopify Plus merchants. With the deprecation of checkout.liquid in August 2025, merchants must migrate to Shopify Functions. However, Shopify Functions require complex coding (Rust/WASM) and have a strict limit of 5 active validation apps per store.

LogicFlow solves this by acting as a single container for infinite validation rules. It decouples the definition of logic (visual UI) from the execution (single optimized WASM function), allowing merchants to enforce complex business rules without hitting platform limits or hiring developers.

## **2\. Problem Statement**

* **The Technical Barrier:** Non-technical merchants cannot replicate their old checkout.liquid scripts (e.g., "Block PO Boxes") using the new Shopify Functions architecture without writing code.  
* **The 5-Function Limit:** Shopify limits stores to 5 active validation functions. A merchant needing age verification, address validation, quantity limits, and fraud checks will hit this ceiling immediately.  
* **The Usability Gap:** There is no native visual builder for Checkout Validation in the Shopify Admin.

## **3\. Goals & Success Metrics**

* **Primary Goal:** Enable merchants to create complex AND/OR validation logic without writing a single line of code.  
* **Technical Goal:** Consolidate infinite rules into a single Shopify Function execution to bypass the 5-app limit.  
* **Business Goal:** Reach $5k MRR within 6 months by targeting the checkout migration deadline.  
* **Key Performance Indicator (KPI):**  
  * Time-to-First-Rule (User creates and saves a rule in \< 2 minutes).  
  * Function Execution Time (Must remain under Shopify's 5ms/10ms limit regardless of rule count).

## **4\. User Personas**

* **The Operations Manager (Primary):** Non-technical. Needs to stop shipping to Hawaii because shipping costs are too high. Wants a "Zapier-like" interface.  
* **The Agency Developer (Secondary):** Technical but overwhelmed. Needs a tool to rapidly migrate 20+ clients off checkout.liquid without writing custom Rust code for every edge case.

## **5\. Feature Requirements**

### **5.1 The Visual Rule Builder (Core)**

* **Drag-and-Drop Interface:** Users can select triggers and actions.  
* **Logic Gates:** Support for nested AND / OR conditions.  
* **Trigger Variables:**  
  * Cart Total (Amount, Quantity, Weight)  
  * Customer Tags (e.g., VIP, Wholesale, Blacklist)  
  * Shipping Address (Zip Code, Country, PO Box detection)  
  * Line Items (Product Vendor, SKU, Properties/Metafields)  
* **Actions:**  
  * Block Checkout (Prevent payment)  
  * Display Error Message (Customizable localized text)

### **5.2 The "One Function" Architecture**

* **Consolidation:** The app must deploy only **one** Shopify Function extension.  
* **Configuration:** All rules created in the UI must be compiled into a single JSON configuration object stored in a Shop Metafield.

### **5.3 Advanced Features**

* **Regex Library:** Pre-built, verified Regular Expressions for common needs (e.g., Email validation, Phone formats, UK Postcodes).  
* **Line Item Property Inspection:** Ability to validate custom form data (e.g., "If 'Engraving' contains profanity, block checkout").

### **5.4 "Test Your Cart" Simulator**

* **Requirement:** An in-admin sandbox where the merchant can build a mock cart and run their active rules against it to see pass/fail results without placing a real order.

## **6\. Pricing Strategy**

* **Starter ($19/mo):** Up to 5 active rules.  
* **Growth ($49/mo):** Unlimited rules, Regex library, Simulator.  
* **Plus ($149/mo):** Multi-store syncing (dev-to-prod), Priority Support.

## **7\. Roadmap**

* **Phase 1 (MVP):** Rule Builder, Metafield Sync, Basic Address & Cart Validation.  
* **Phase 2:** Regex Library, Test Simulator.  
* **Phase 3:** Template Library ("One-click PO Box Block").