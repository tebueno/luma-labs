import { useState, useCallback, useMemo } from "react";
import {
  Modal,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Icon,
  Badge,
  Box,
  Divider,
  Tag,
  Combobox,
  Listbox,
} from "@shopify/polaris";
import {
  PlayIcon,
  CartIcon,
  LocationIcon,
  PersonIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@shopify/polaris-icons";
import type { Rule } from "../types";
import {
  evaluateRules,
  DEFAULT_MOCK_CART,
  SUPPORTED_CUSTOMER_TAGS,
  type MockCart,
  type TestResults,
} from "../evaluator";

// ============================================================================
// Test Scenario Presets
// ============================================================================

interface TestPreset {
  id: string;
  name: string;
  description: string;
  icon: typeof CartIcon;
  cart: MockCart;
}

const TEST_PRESETS: TestPreset[] = [
  {
    id: "high-value",
    name: "High-Value Order",
    description: "Cart total over $500",
    icon: CartIcon,
    cart: {
      total: 750,
      quantity: 3,
      customerTags: [],
      shippingAddress: {
        address1: "123 Main Street",
        address2: "",
        city: "New York",
        country: "US",
        zip: "10001",
      },
    },
  },
  {
    id: "po-box",
    name: "PO Box Address",
    description: "Ships to a PO Box",
    icon: LocationIcon,
    cart: {
      total: 99,
      quantity: 1,
      customerTags: [],
      shippingAddress: {
        address1: "PO Box 12345",
        address2: "",
        city: "Anytown",
        country: "US",
        zip: "90210",
      },
    },
  },
  {
    id: "wholesale",
    name: "Wholesale Customer",
    description: "Customer has wholesale tag",
    icon: PersonIcon,
    cart: {
      total: 250,
      quantity: 10,
      customerTags: ["wholesale"],
      shippingAddress: {
        address1: "456 Business Ave",
        address2: "Suite 200",
        city: "Los Angeles",
        country: "US",
        zip: "90001",
      },
    },
  },
];

interface TestSimulatorProps {
  rules: Rule[];
  open: boolean;
  onClose: () => void;
}

export function TestSimulator({ rules, open, onClose }: TestSimulatorProps) {
  const [mockCart, setMockCart] = useState<MockCart>(DEFAULT_MOCK_CART);
  const [results, setResults] = useState<TestResults | null>(null);
  const [tagInputValue, setTagInputValue] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const enabledRulesCount = rules.filter((r) => r.enabled).length;

  const applyPreset = useCallback((preset: TestPreset) => {
    setMockCart(preset.cart);
    setActivePreset(preset.id);
    setResults(null);
  }, []);

  const handleRunTest = useCallback(() => {
    const startTime = performance.now();
    const testResults = evaluateRules(rules, mockCart);
    const endTime = performance.now();
    // Store execution time for display (simulated)
    (testResults as any).executionTime = (endTime - startTime).toFixed(2);
    setResults(testResults);
  }, [rules, mockCart]);

  const updateCart = useCallback(
    (
      field:
        | keyof MockCart
        | "address1"
        | "address2"
        | "city"
        | "country"
        | "zip",
      value: string
    ) => {
      setMockCart((prev) => {
        if (field === "total") {
          return { ...prev, total: parseFloat(value) || 0 };
        }
        if (field === "quantity") {
          return { ...prev, quantity: parseInt(value, 10) || 0 };
        }
        if (
          field === "address1" ||
          field === "address2" ||
          field === "city" ||
          field === "country" ||
          field === "zip"
        ) {
          return {
            ...prev,
            shippingAddress: {
              ...prev.shippingAddress,
              [field]: value,
            },
          };
        }
        return prev;
      });
      // Clear results and preset when inputs change
      setResults(null);
      setActivePreset(null);
    },
    []
  );

  const addTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (!trimmedTag) return;
    setMockCart((prev) => {
      if (prev.customerTags.includes(trimmedTag)) return prev;
      return { ...prev, customerTags: [...prev.customerTags, trimmedTag] };
    });
    setTagInputValue("");
    setResults(null);
  }, []);

  const removeTag = useCallback((tag: string) => {
    setMockCart((prev) => ({
      ...prev,
      customerTags: prev.customerTags.filter((t) => t !== tag),
    }));
    setResults(null);
  }, []);

  // Filter suggestions based on input, excluding already added tags
  const filteredTags = useMemo(() => {
    const notAdded = SUPPORTED_CUSTOMER_TAGS.filter(
      (tag) => !mockCart.customerTags.includes(tag)
    );
    if (!tagInputValue) return notAdded;
    const lowerInput = tagInputValue.toLowerCase();
    return notAdded.filter((tag) => tag.includes(lowerInput));
  }, [tagInputValue, mockCart.customerTags]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Test Simulator"
      primaryAction={{
        content: `Run Test (${enabledRulesCount} rule${enabledRulesCount !== 1 ? "s" : ""})`,
        onAction: handleRunTest,
        icon: PlayIcon,
        disabled: enabledRulesCount === 0,
      }}
      secondaryActions={[{ content: "Close", onAction: onClose }]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="400">
          {/* Quick Test Presets */}
          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">
              Quick Test Scenarios
            </Text>
            <InlineStack gap="200" wrap>
              {TEST_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  icon={preset.icon}
                  onClick={() => applyPreset(preset)}
                  pressed={activePreset === preset.id}
                  size="slim"
                >
                  {preset.name}
                </Button>
              ))}
            </InlineStack>
            {activePreset && (
              <Text as="span" variant="bodySm" tone="subdued">
                {TEST_PRESETS.find((p) => p.id === activePreset)?.description}
              </Text>
            )}
          </BlockStack>

          <Divider />

          {/* Cart & Customer Details - side by side layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            {/* Left Column: Cart Details */}
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Cart Details
              </Text>

              <TextField
                label="Cart Total"
                type="number"
                value={String(mockCart.total)}
                onChange={(v) => updateCart("total", v)}
                autoComplete="off"
                min={0}
                prefix="$"
              />

              <TextField
                label="Item Count"
                type="number"
                value={String(mockCart.quantity)}
                onChange={(v) => updateCart("quantity", v)}
                autoComplete="off"
                min={0}
              />

              <Text as="h3" variant="headingSm">
                Customer Tags
              </Text>

              <BlockStack gap="200">
                <InlineStack gap="200" wrap>
                  {mockCart.customerTags.map((tag) => (
                    <Tag key={tag} onRemove={() => removeTag(tag)}>
                      {tag}
                    </Tag>
                  ))}
                  {mockCart.customerTags.length === 0 && (
                    <Text as="span" variant="bodySm" tone="subdued">
                      No tags (guest checkout)
                    </Text>
                  )}
                </InlineStack>

                <Combobox
                  activator={
                    <Combobox.TextField
                      label="Add tag"
                      labelHidden
                      value={tagInputValue}
                      onChange={setTagInputValue}
                      onBlur={() => {
                        if (tagInputValue.trim()) {
                          addTag(tagInputValue);
                        }
                      }}
                      placeholder="Type to add tag..."
                      autoComplete="off"
                    />
                  }
                >
                  {filteredTags.length > 0 && (
                    <Listbox onSelect={addTag}>
                      {filteredTags.slice(0, 10).map((tag) => (
                        <Listbox.Option key={tag} value={tag}>
                          {tag}
                        </Listbox.Option>
                      ))}
                      {tagInputValue &&
                        !SUPPORTED_CUSTOMER_TAGS.includes(
                          tagInputValue.toLowerCase() as (typeof SUPPORTED_CUSTOMER_TAGS)[number]
                        ) &&
                        !mockCart.customerTags.includes(
                          tagInputValue.toLowerCase()
                        ) && (
                          <Listbox.Option value={tagInputValue.toLowerCase()}>
                            Add custom: "{tagInputValue}"
                          </Listbox.Option>
                        )}
                    </Listbox>
                  )}
                  {filteredTags.length === 0 && tagInputValue && (
                    <Listbox onSelect={addTag}>
                      <Listbox.Option value={tagInputValue.toLowerCase()}>
                        Add custom: "{tagInputValue}"
                      </Listbox.Option>
                    </Listbox>
                  )}
                </Combobox>
              </BlockStack>
            </BlockStack>

            {/* Right Column: Shipping Address */}
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Shipping Address
              </Text>

              <TextField
                label="Address Line 1"
                value={mockCart.shippingAddress.address1}
                onChange={(v) => updateCart("address1", v)}
                autoComplete="off"
                placeholder="e.g., 123 Main St or PO Box 123"
              />

              <TextField
                label="Address Line 2"
                value={mockCart.shippingAddress.address2}
                onChange={(v) => updateCart("address2", v)}
                autoComplete="off"
                placeholder="e.g., Apt 4B"
              />

              <TextField
                label="City"
                value={mockCart.shippingAddress.city}
                onChange={(v) => updateCart("city", v)}
                autoComplete="off"
                placeholder="e.g., New York"
              />

              <InlineStack gap="300" wrap={false}>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="ZIP Code"
                    value={mockCart.shippingAddress.zip}
                    onChange={(v) => updateCart("zip", v)}
                    autoComplete="off"
                    placeholder="e.g., 10001"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Country"
                    value={mockCart.shippingAddress.country}
                    onChange={(v) => updateCart("country", v)}
                    autoComplete="off"
                    placeholder="e.g., US"
                  />
                </div>
              </InlineStack>
            </BlockStack>
          </div>
        </BlockStack>
      </Modal.Section>

      {/* Results Section */}
      {results && (
        <Modal.Section>
          <BlockStack gap="400">
            {/* Results Header */}
            <Box
              padding="400"
              background={
                results.rulesBlocked > 0
                  ? "bg-surface-critical"
                  : "bg-surface-success"
              }
              borderRadius="200"
            >
              <InlineStack gap="300" blockAlign="center">
                <Icon
                  source={
                    results.rulesBlocked > 0 ? XCircleIcon : CheckCircleIcon
                  }
                  tone={results.rulesBlocked > 0 ? "critical" : "success"}
                />
                <BlockStack gap="050">
                  <Text as="span" variant="headingSm">
                    {results.rulesBlocked > 0
                      ? "Checkout Would Be Blocked"
                      : "Checkout Would Pass"}
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    {results.rulesBlocked} blocked, {results.rulesPassed} passed
                    {(results as any).executionTime && (
                      <> • Evaluated in {(results as any).executionTime}ms</>
                    )}
                  </Text>
                </BlockStack>
              </InlineStack>
            </Box>

            {/* Individual Rule Results */}
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm" tone="subdued">
                Rule-by-Rule Results
              </Text>
              {results.results.map((result) => (
                <Box
                  key={result.ruleId}
                  padding="300"
                  background="bg-surface-secondary"
                  borderRadius="200"
                  borderColor={result.blocked ? "border-critical" : "border-success"}
                  borderWidth="025"
                >
                  <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon
                          source={result.blocked ? XCircleIcon : CheckCircleIcon}
                          tone={result.blocked ? "critical" : "success"}
                        />
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          {result.ruleName}
                        </Text>
                      </InlineStack>
                      <Badge tone={result.blocked ? "critical" : "success"}>
                        {result.blocked ? "Blocked" : "Passed"}
                      </Badge>
                    </InlineStack>

                    {/* Show triggered conditions for blocked rules */}
                    {result.blocked && result.conditionResults.filter((c) => c.passed).length > 0 && (
                      <Box paddingInlineStart="400">
                        <BlockStack gap="100">
                          <Text as="span" variant="bodySm" tone="subdued">
                            Triggered conditions:
                          </Text>
                          {result.conditionResults
                            .filter((c) => c.passed)
                            .map((c, i) => (
                              <InlineStack key={i} gap="100" blockAlign="center">
                                <Icon source={XCircleIcon} tone="critical" />
                                <Text as="span" variant="bodySm">
                                  {c.description}
                                </Text>
                              </InlineStack>
                            ))}
                        </BlockStack>
                      </Box>
                    )}

                    {/* Show passed conditions for passed rules */}
                    {!result.blocked && (
                      <Box paddingInlineStart="400">
                        <Text as="span" variant="bodySm" tone="subdued">
                          No conditions matched - checkout allowed
                        </Text>
                      </Box>
                    )}
                  </BlockStack>
                </Box>
              ))}
            </BlockStack>

            {results.rulesEvaluated === 0 && (
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                  No enabled rules to test. Enable at least one rule to run tests.
                </Text>
              </Box>
            )}
          </BlockStack>
        </Modal.Section>
      )}
    </Modal>
  );
}

