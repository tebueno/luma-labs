import {
  Card,
  BlockStack,
  Text,
  Box,
  Divider,
  InlineStack,
  ProgressBar,
  Banner,
} from "@shopify/polaris";
import type { Rule } from "../types";
import { COMPLEXITY_BUDGET, DEFAULT_TIER } from "../constants";
import { TestSimulator } from "./TestSimulator";

// Current budget based on tier (will be dynamic in Phase 4)
const CURRENT_BUDGET = COMPLEXITY_BUDGET[DEFAULT_TIER];

interface StatusSidebarProps {
  rules: Rule[];
  totalComplexity: number;
}

export function StatusSidebar({ rules, totalComplexity }: StatusSidebarProps) {
  const activeRulesCount = rules.filter((r) => r.enabled).length;
  
  // Calculate budget usage
  const budgetUsagePercent = Math.min((totalComplexity / CURRENT_BUDGET) * 100, 100);
  const isNearLimit = budgetUsagePercent >= 80;
  const isAtLimit = totalComplexity >= CURRENT_BUDGET;
  const remainingPoints = Math.max(CURRENT_BUDGET - totalComplexity, 0);

  // Determine progress bar color
  const progressTone = isAtLimit ? "critical" : isNearLimit ? "warning" : "primary";

  return (
    <BlockStack gap="400">
      {/* Complexity Budget Card */}
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Complexity Budget
          </Text>
          
          <BlockStack gap="200">
            <InlineStack align="space-between">
              <Text as="span" variant="bodySm" tone="subdued">
                {totalComplexity} / {CURRENT_BUDGET} pts used
              </Text>
              <Text as="span" variant="bodySm" fontWeight="semibold">
                {remainingPoints} remaining
              </Text>
            </InlineStack>
            
            <ProgressBar
              progress={budgetUsagePercent}
              tone={progressTone}
              size="small"
            />
          </BlockStack>

          {isAtLimit && (
            <Banner tone="critical">
              Budget exceeded! Disable or remove rules to add more.
            </Banner>
          )}

          {isNearLimit && !isAtLimit && (
            <Banner tone="warning">
              Approaching budget limit. Consider upgrading for more capacity.
            </Banner>
          )}

          <Box paddingBlockStart="100">
            <Text as="p" variant="bodySm" tone="subdued">
              Free plan: {COMPLEXITY_BUDGET.FREE} pts
            </Text>
          </Box>
        </BlockStack>
      </Card>

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
              Active Rules
            </Text>
            <Text as="span" variant="bodySm" fontWeight="semibold">
              {activeRulesCount}
            </Text>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Test Simulator */}
      <TestSimulator rules={rules} />

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
