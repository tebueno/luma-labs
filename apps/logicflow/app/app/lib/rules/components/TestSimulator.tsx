import { useState, useCallback, useMemo } from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Collapsible,
  Icon,
  Badge,
  Box,
  Divider,
  Tag,
  Combobox,
  Listbox,
} from "@shopify/polaris";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlayIcon,
} from "@shopify/polaris-icons";
import type { Rule } from "../types";
import {
  evaluateRules,
  DEFAULT_MOCK_CART,
  SUPPORTED_CUSTOMER_TAGS,
  type MockCart,
  type TestResults,
} from "../evaluator";

interface TestSimulatorProps {
  rules: Rule[];
}

export function TestSimulator({ rules }: TestSimulatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mockCart, setMockCart] = useState<MockCart>(DEFAULT_MOCK_CART);
  const [results, setResults] = useState<TestResults | null>(null);
  const [tagInputValue, setTagInputValue] = useState("");

  const enabledRulesCount = rules.filter((r) => r.enabled).length;

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleRunTest = useCallback(() => {
    const testResults = evaluateRules(rules, mockCart);
    setResults(testResults);
  }, [rules, mockCart]);

  const updateCart = useCallback(
    (field: keyof MockCart | "zip" | "country" | "city", value: string) => {
      setMockCart((prev) => {
        if (field === "total") {
          return { ...prev, total: parseFloat(value) || 0 };
        }
        if (field === "quantity") {
          return { ...prev, quantity: parseInt(value, 10) || 0 };
        }
        if (field === "zip" || field === "country" || field === "city") {
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
      // Clear results when inputs change
      setResults(null);
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
    <Card>
      <BlockStack gap="300">
        {/* Header - clickable to expand/collapse */}
        <div
          onClick={handleToggle}
          style={{ cursor: "pointer" }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleToggle()}
        >
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="200" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Test Simulator
              </Text>
              {enabledRulesCount === 0 && (
                <Badge tone="attention">No active rules</Badge>
              )}
            </InlineStack>
            <Icon source={isOpen ? ChevronUpIcon : ChevronDownIcon} />
          </InlineStack>
        </div>

        <Collapsible open={isOpen} id="test-simulator">
          <BlockStack gap="400">
            <Divider />

            {/* Cart Inputs */}
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm" tone="subdued">
                Mock Cart Data
              </Text>

              <InlineStack gap="300" wrap={false}>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Cart Total ($)"
                    type="number"
                    value={String(mockCart.total)}
                    onChange={(v) => updateCart("total", v)}
                    autoComplete="off"
                    min={0}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={String(mockCart.quantity)}
                    onChange={(v) => updateCart("quantity", v)}
                    autoComplete="off"
                    min={0}
                  />
                </div>
              </InlineStack>

              <Text as="h3" variant="headingSm" tone="subdued">
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
                      placeholder="Type to search or add custom tag..."
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

              <Text as="h3" variant="headingSm" tone="subdued">
                Shipping Address
              </Text>

              <TextField
                label="ZIP Code"
                value={mockCart.shippingAddress.zip}
                onChange={(v) => updateCart("zip", v)}
                autoComplete="off"
                placeholder="e.g., 94954"
              />

              <InlineStack gap="300" wrap={false}>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Country"
                    value={mockCart.shippingAddress.country}
                    onChange={(v) => updateCart("country", v)}
                    autoComplete="off"
                    placeholder="e.g., US"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="City"
                    value={mockCart.shippingAddress.city}
                    onChange={(v) => updateCart("city", v)}
                    autoComplete="off"
                    placeholder="e.g., Petaluma"
                  />
                </div>
              </InlineStack>
            </BlockStack>

            {/* Run Button */}
            <Button
              onClick={handleRunTest}
              icon={PlayIcon}
              disabled={enabledRulesCount === 0}
              variant="primary"
              fullWidth
            >
              Run Test ({enabledRulesCount} rule
              {enabledRulesCount !== 1 ? "s" : ""})
            </Button>

            {/* Results */}
            {results && (
              <BlockStack gap="300">
                <Divider />

                {/* Summary */}
                <InlineStack align="space-between">
                  <Text as="span" variant="bodySm" tone="subdued">
                    Results
                  </Text>
                  <InlineStack gap="200">
                    {results.rulesBlocked > 0 && (
                      <Badge tone="critical">
                        {results.rulesBlocked} blocked
                      </Badge>
                    )}
                    {results.rulesPassed > 0 && (
                      <Badge tone="success">{results.rulesPassed} passed</Badge>
                    )}
                  </InlineStack>
                </InlineStack>

                {/* Individual Results */}
                <BlockStack gap="200">
                  {results.results.map((result) => (
                    <Box
                      key={result.ruleId}
                      padding="300"
                      background={
                        result.blocked ? "bg-surface-critical" : "bg-surface-success"
                      }
                      borderRadius="200"
                    >
                      <BlockStack gap="100">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="span" variant="bodySm" fontWeight="semibold">
                            {result.ruleName}
                          </Text>
                          <Badge tone={result.blocked ? "critical" : "success"}>
                            {result.blocked ? "Blocked" : "Passed"}
                          </Badge>
                        </InlineStack>

                        {/* Show triggered conditions for blocked rules */}
                        {result.blocked && (
                          <BlockStack gap="050">
                            {result.conditionResults
                              .filter((c) => c.passed)
                              .map((c, i) => (
                                <Text
                                  key={i}
                                  as="span"
                                  variant="bodySm"
                                  tone="subdued"
                                >
                                  → {c.description}
                                </Text>
                              ))}
                          </BlockStack>
                        )}
                      </BlockStack>
                    </Box>
                  ))}
                </BlockStack>

                {results.rulesEvaluated === 0 && (
                  <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                    No enabled rules to test
                  </Text>
                )}
              </BlockStack>
            )}
          </BlockStack>
        </Collapsible>
      </BlockStack>
    </Card>
  );
}

