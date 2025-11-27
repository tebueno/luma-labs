import { Card, BlockStack, Text, Box, Divider, InlineStack } from "@shopify/polaris";
import type { Rule } from "../types";

interface StatusSidebarProps {
  rules: Rule[];
  totalComplexity: number;
}

export function StatusSidebar({ rules, totalComplexity }: StatusSidebarProps) {
  const activeRulesCount = rules.filter((r) => r.enabled).length;

  return (
    <BlockStack gap="400">
      {/* Status Card */}
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Status
          </Text>
          <Box
            padding="300"
            background={
              activeRulesCount > 0 ? "bg-surface-success" : "bg-surface-caution"
            }
            borderRadius="200"
          >
            <Text as="p" variant="bodyMd">
              {activeRulesCount > 0
                ? `✅ ${activeRulesCount} Active Rule${activeRulesCount > 1 ? "s" : ""}`
                : "⚠️ No Active Rules"}
            </Text>
          </Box>
          <Divider />
          <InlineStack align="space-between">
            <Text as="span" variant="bodySm">
              Total Rules
            </Text>
            <Text as="span" variant="bodySm" fontWeight="semibold">
              {rules.length}
            </Text>
          </InlineStack>
          <InlineStack align="space-between">
            <Text as="span" variant="bodySm">
              Total Complexity
            </Text>
            <Text as="span" variant="bodySm" fontWeight="semibold">
              {totalComplexity} pts
            </Text>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Help Card */}
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Quick Guide
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            1. Click "Add Rule" to create a validation rule
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            2. Set the condition (e.g., "Cart Total &gt; 100")
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            3. Write the error message customers will see
          </Text>
          <Text as="p" variant="bodySm" tone="subdued">
            4. Rules are enforced at checkout automatically
          </Text>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

