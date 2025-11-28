import {
  Card,
  BlockStack,
  Text,
  Box,
  Divider,
  InlineStack,
  Banner,
  Icon,
  Badge,
} from "@shopify/polaris";
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  ChartVerticalIcon,
} from "@shopify/polaris-icons";
import type { Rule } from "../types";
import { COMPLEXITY_BUDGET, DEFAULT_TIER } from "../constants";
import { TestSimulator } from "./TestSimulator";

// Current budget based on tier (will be dynamic in Phase 4)
const CURRENT_BUDGET = COMPLEXITY_BUDGET[DEFAULT_TIER];

// ============================================================================
// Custom Gradient Progress Bar
// ============================================================================

interface GradientProgressBarProps {
  used: number;
  total: number;
}

function GradientProgressBar({ used, total }: GradientProgressBarProps) {
  const percentage = Math.min((used / total) * 100, 100);
  
  // Determine color based on usage
  let barColor = "#008060"; // green
  if (percentage >= 80 && percentage < 100) {
    barColor = "#b98900"; // yellow/warning
  } else if (percentage >= 100) {
    barColor = "#d72c0d"; // red/critical
  }

  return (
    <div
      style={{
        width: "100%",
        height: "12px",
        backgroundColor: "#e4e5e7",
        borderRadius: "6px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          width: `${percentage}%`,
          height: "100%",
          backgroundColor: barColor,
          borderRadius: "6px",
          transition: "width 0.3s ease, background-color 0.3s ease",
        }}
      />
      {/* Threshold markers */}
      <div
        style={{
          position: "absolute",
          left: "80%",
          top: 0,
          width: "1px",
          height: "100%",
          backgroundColor: "#8c9196",
          opacity: 0.5,
        }}
      />
    </div>
  );
}

// ============================================================================
// Complexity Breakdown
// ============================================================================

interface ComplexityBreakdownProps {
  rules: Rule[];
}

function ComplexityBreakdown({ rules }: ComplexityBreakdownProps) {
  const activeComplexity = rules
    .filter((r) => r.enabled)
    .reduce((sum, r) => sum + r.complexity, 0);
  const disabledComplexity = rules
    .filter((r) => !r.enabled)
    .reduce((sum, r) => sum + r.complexity, 0);

  return (
    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
      <BlockStack gap="200">
        <Text as="span" variant="bodySm" fontWeight="semibold">
          Breakdown
        </Text>
        <InlineStack align="space-between">
          <InlineStack gap="100" blockAlign="center">
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#008060",
              }}
            />
            <Text as="span" variant="bodySm">
              Active rules
            </Text>
          </InlineStack>
          <Text as="span" variant="bodySm" fontWeight="semibold">
            {activeComplexity} pts
          </Text>
        </InlineStack>
        {disabledComplexity > 0 && (
          <InlineStack align="space-between">
            <InlineStack gap="100" blockAlign="center">
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "#8c9196",
                }}
              />
              <Text as="span" variant="bodySm" tone="subdued">
                Disabled rules
              </Text>
            </InlineStack>
            <Text as="span" variant="bodySm" tone="subdued">
              {disabledComplexity} pts
            </Text>
          </InlineStack>
        )}
      </BlockStack>
    </Box>
  );
}

// ============================================================================
// Plan Comparison Nudge
// ============================================================================

function PlanNudge({ currentUsage, currentBudget }: { currentUsage: number; currentBudget: number }) {
  const usagePercent = (currentUsage / currentBudget) * 100;
  
  if (usagePercent < 60) return null;
  
  return (
    <Box
      padding="300"
      background="bg-surface-info"
      borderRadius="200"
    >
      <BlockStack gap="200">
        <InlineStack gap="200" blockAlign="center">
          <Icon source={ChartVerticalIcon} tone="info" />
          <Text as="span" variant="bodySm" fontWeight="semibold">
            Need more capacity?
          </Text>
        </InlineStack>
        <Text as="span" variant="bodySm" tone="subdued">
          Upgrade to Starter for {COMPLEXITY_BUDGET.STARTER} pts ({Math.round(COMPLEXITY_BUDGET.STARTER / currentBudget)}x more)
        </Text>
      </BlockStack>
    </Box>
  );
}

// ============================================================================
// Main Status Sidebar
// ============================================================================

interface StatusSidebarProps {
  rules: Rule[];
  totalComplexity: number;
}

export function StatusSidebar({ rules, totalComplexity }: StatusSidebarProps) {
  const activeRulesCount = rules.filter((r) => r.enabled).length;
  const disabledRulesCount = rules.length - activeRulesCount;
  
  // Calculate budget usage
  const budgetUsagePercent = Math.min((totalComplexity / CURRENT_BUDGET) * 100, 100);
  const isNearLimit = budgetUsagePercent >= 80;
  const isAtLimit = totalComplexity >= CURRENT_BUDGET;
  const remainingPoints = Math.max(CURRENT_BUDGET - totalComplexity, 0);

  return (
    <BlockStack gap="400">
      {/* Complexity Budget Card */}
      <Card>
        <BlockStack gap="400">
          {/* Header */}
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">
              Complexity Budget
            </Text>
            <Badge tone={isAtLimit ? "critical" : isNearLimit ? "warning" : "success"}>
              {isAtLimit ? "At Limit" : isNearLimit ? `${Math.round(budgetUsagePercent)}% Used` : "Healthy"}
            </Badge>
          </InlineStack>
          
          {/* Big number display */}
          <Box>
            <InlineStack gap="100" blockAlign="end">
              <Text as="span" variant="heading2xl">
                {totalComplexity}
              </Text>
              <Text as="span" variant="bodyLg" tone="subdued">
                / {CURRENT_BUDGET} pts
              </Text>
            </InlineStack>
            <Text as="span" variant="bodySm" tone="subdued">
              {remainingPoints} points remaining
            </Text>
          </Box>

          {/* Gradient Progress Bar */}
          <GradientProgressBar used={totalComplexity} total={CURRENT_BUDGET} />
          
          {/* Breakdown */}
          {rules.length > 0 && <ComplexityBreakdown rules={rules} />}

          {/* Warning/Critical Banners */}
          {isAtLimit && (
            <Banner tone="critical" icon={XCircleIcon}>
              <Text as="span" variant="bodySm">
                Budget exceeded! Disable or remove rules to create new ones.
              </Text>
            </Banner>
          )}

          {isNearLimit && !isAtLimit && (
            <Banner tone="warning" icon={AlertTriangleIcon}>
              <Text as="span" variant="bodySm">
                Approaching your budget limit ({Math.round(budgetUsagePercent)}% used).
              </Text>
            </Banner>
          )}

          {/* Upgrade nudge */}
          <PlanNudge currentUsage={totalComplexity} currentBudget={CURRENT_BUDGET} />

          {/* Plan info */}
          <Divider />
          <InlineStack align="space-between">
            <Text as="span" variant="bodySm" tone="subdued">
              Current plan
            </Text>
            <Text as="span" variant="bodySm" fontWeight="semibold">
              Free ({CURRENT_BUDGET} pts)
            </Text>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Test Simulator */}
      <TestSimulator rules={rules} />

      {/* Quick Guide Card */}
      <Card>
        <BlockStack gap="300">
          <Text as="h2" variant="headingMd">
            Quick Guide
          </Text>
          <BlockStack gap="200">
            <InlineStack gap="200" blockAlign="start">
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "#e4e5e7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#6d7175",
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <Text as="p" variant="bodySm" tone="subdued">
                Click "Add Rule" to create a validation rule
              </Text>
            </InlineStack>
            <InlineStack gap="200" blockAlign="start">
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "#e4e5e7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#6d7175",
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <Text as="p" variant="bodySm" tone="subdued">
                Set conditions like "Cart Total &gt; $100"
              </Text>
            </InlineStack>
            <InlineStack gap="200" blockAlign="start">
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  backgroundColor: "#e4e5e7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#6d7175",
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <Text as="p" variant="bodySm" tone="subdued">
                Test with the simulator, then go live!
              </Text>
            </InlineStack>
          </BlockStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
