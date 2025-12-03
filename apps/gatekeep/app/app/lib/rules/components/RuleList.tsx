import {
  Card,
  ResourceList,
  ResourceItem,
  InlineStack,
  BlockStack,
  Text,
  Badge,
  Button,
  Tooltip,
  Box,
  Icon,
} from "@shopify/polaris";
import {
  DeleteIcon,
  EditIcon,
  ViewIcon,
  HideIcon,
  CartIcon,
  LocationIcon,
  PersonIcon,
} from "@shopify/polaris-icons";
import type { Rule } from "../types";
import { getRuleSummary } from "../utils";

interface RuleListProps {
  rules: Rule[];
  onEdit: (rule: Rule) => void;
  onToggle: (ruleId: string) => void;
  onDelete: (ruleId: string) => void;
  onAddRule: () => void;
  onClearAll: () => void;
}

// ============================================================================
// Custom Empty State Illustration
// ============================================================================

function GatekeepIllustration() {
  return (
    <svg
      width="200"
      height="160"
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ margin: "0 auto", display: "block" }}
    >
      {/* Background gradient circle */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e3f1df" />
          <stop offset="100%" stopColor="#f1f8ee" />
        </linearGradient>
        <linearGradient id="blockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fce4e4" />
          <stop offset="100%" stopColor="#fff5f5" />
        </linearGradient>
      </defs>
      
      {/* Condition boxes */}
      <rect x="10" y="25" width="70" height="35" rx="6" fill="#f4f6f8" stroke="#8c9196" strokeWidth="1.5" />
      <text x="45" y="47" textAnchor="middle" fontSize="11" fill="#202223" fontWeight="500">Cart &gt; $100</text>
      
      <rect x="10" y="75" width="70" height="35" rx="6" fill="#f4f6f8" stroke="#8c9196" strokeWidth="1.5" />
      <text x="45" y="97" textAnchor="middle" fontSize="11" fill="#202223" fontWeight="500">PO Box</text>
      
      {/* AND/OR connector */}
      <rect x="95" y="55" width="30" height="24" rx="4" fill="#5c6ac4" />
      <text x="110" y="71" textAnchor="middle" fontSize="10" fill="white" fontWeight="600">OR</text>
      
      {/* Connecting lines */}
      <path d="M80 42 L95 67" stroke="#8c9196" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M80 92 L95 67" stroke="#8c9196" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M125 67 L145 67" stroke="#8c9196" strokeWidth="1.5" strokeLinecap="round" />
      
      {/* Result: Block checkout */}
      <rect x="145" y="47" width="45" height="40" rx="6" fill="url(#blockGradient)" stroke="#d72c0d" strokeWidth="1.5" />
      <circle cx="167" cy="62" r="8" fill="#d72c0d" />
      <path d="M163 62 L171 62" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <text x="167" y="80" textAnchor="middle" fontSize="8" fill="#d72c0d" fontWeight="500">BLOCK</text>
      
      {/* Decorative elements */}
      <circle cx="25" cy="130" r="4" fill="#5c6ac4" opacity="0.3" />
      <circle cx="45" cy="140" r="3" fill="#5c6ac4" opacity="0.2" />
      <circle cx="175" cy="120" r="5" fill="#008060" opacity="0.3" />
      <circle cx="155" cy="135" r="3" fill="#008060" opacity="0.2" />
      
      {/* Label */}
      <text x="100" y="150" textAnchor="middle" fontSize="10" fill="#6d7175">Visual checkout validation</text>
    </svg>
  );
}

// ============================================================================
// Use Case Templates
// ============================================================================

interface UseCaseProps {
  icon: typeof CartIcon;
  title: string;
  description: string;
}

function UseCaseCard({ icon, title, description }: UseCaseProps) {
  return (
    <Box
      padding="300"
      background="bg-surface-secondary"
      borderRadius="200"
    >
      <InlineStack gap="200" blockAlign="start" wrap={false}>
        <Box>
          <Icon source={icon} tone="base" />
        </Box>
        <BlockStack gap="050">
          <Text as="span" variant="bodySm" fontWeight="semibold">
            {title}
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            {description}
          </Text>
        </BlockStack>
      </InlineStack>
    </Box>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function RuleListEmptyState({ onAddRule }: { onAddRule: () => void }) {
  return (
    <Card>
      <Box padding="600">
        <BlockStack gap="500" align="center">
          {/* Custom Illustration */}
          <GatekeepIllustration />

          {/* Headline */}
          <BlockStack gap="200" align="center">
            <Text as="h2" variant="headingLg" alignment="center">
              Protect Your Checkout in Minutes
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
              Block fraudulent orders, restrict shipping zones, enforce business
              rules — all without writing code. Your rules run at checkout in
              under 5ms.
            </Text>
          </BlockStack>

          {/* CTA Button */}
          <Button variant="primary" size="large" onClick={onAddRule}>
            Create Your First Rule
          </Button>

          {/* Use Cases */}
          <Box paddingBlockStart="400" width="100%">
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm" tone="subdued">
                Popular use cases
              </Text>
              <InlineStack gap="300" wrap>
                <Box minWidth="200px">
                  <UseCaseCard
                    icon={LocationIcon}
                    title="Block PO Boxes"
                    description="Prevent shipping to PO Box addresses"
                  />
                </Box>
                <Box minWidth="200px">
                  <UseCaseCard
                    icon={CartIcon}
                    title="Order Limits"
                    description="Set min/max cart totals or quantities"
                  />
                </Box>
                <Box minWidth="200px">
                  <UseCaseCard
                    icon={PersonIcon}
                    title="Customer Restrictions"
                    description="Block or allow by customer tag"
                  />
                </Box>
              </InlineStack>
            </BlockStack>
          </Box>
        </BlockStack>
      </Box>
    </Card>
  );
}

export function RuleList({
  rules,
  onEdit,
  onToggle,
  onDelete,
  onAddRule,
  onClearAll,
}: RuleListProps) {
  if (rules.length === 0) {
    return <RuleListEmptyState onAddRule={onAddRule} />;
  }

  const activeCount = rules.filter((r) => r.enabled).length;
  const totalCount = rules.length;

  return (
    <BlockStack gap="300">
      {/* Summary header */}
      <InlineStack align="space-between" blockAlign="center">
        <Text as="span" variant="headingMd">
          {totalCount} Rule{totalCount !== 1 ? "s" : ""}
        </Text>
        {activeCount > 0 ? (
          <Badge tone="success">{`${activeCount} active`}</Badge>
        ) : (
          <Badge tone="warning">None active</Badge>
        )}
      </InlineStack>

      {/* Rule list */}
      <Card padding="0">
        <ResourceList
          resourceName={{ singular: "rule", plural: "rules" }}
          items={rules}
          renderItem={(rule) => (
            <RuleListItem
              rule={rule}
              onEdit={onEdit}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          )}
        />
      </Card>

      {/* Footer actions */}
      <Box>
        <InlineStack align="end">
          <Button tone="critical" variant="plain" onClick={onClearAll}>
            Clear All Rules
          </Button>
        </InlineStack>
      </Box>
    </BlockStack>
  );
}

// ============================================================================
// Rule List Item
// ============================================================================

interface RuleListItemProps {
  rule: Rule;
  onEdit: (rule: Rule) => void;
  onToggle: (ruleId: string) => void;
  onDelete: (ruleId: string) => void;
}

function RuleListItem({ rule, onEdit, onToggle, onDelete }: RuleListItemProps) {
  const { id, name, enabled, error_message, complexity } = rule;

  return (
    <ResourceItem id={id} onClick={() => onEdit(rule)}>
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        {/* Status indicator strip */}
        <div
          style={{
            width: "4px",
            borderRadius: "2px",
            backgroundColor: enabled ? "#008060" : "#c9cccf",
            alignSelf: "stretch",
            minHeight: "48px",
          }}
        />

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Row 1: Name + Badge + Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                {name}
              </Text>
              <Badge tone={enabled ? "success" : undefined}>
                {enabled ? "Active" : "Disabled"}
              </Badge>
              <Text as="span" variant="bodySm" tone="subdued">
                {complexity} pt{complexity !== 1 ? "s" : ""}
              </Text>
            </div>
            
            {/* Action buttons - fixed on right */}
            <div style={{ display: "flex", gap: "4px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
              <Tooltip content={enabled ? "Disable rule" : "Enable rule"}>
                <Button
                  icon={enabled ? HideIcon : ViewIcon}
                  variant="plain"
                  onClick={() => onToggle(id)}
                  accessibilityLabel={enabled ? `Disable ${name}` : `Enable ${name}`}
                />
              </Tooltip>
              <Tooltip content="Edit rule">
                <Button
                  icon={EditIcon}
                  variant="plain"
                  onClick={() => onEdit(rule)}
                  accessibilityLabel={`Edit ${name}`}
                />
              </Tooltip>
              <Tooltip content="Delete rule">
                <Button
                  icon={DeleteIcon}
                  variant="plain"
                  tone="critical"
                  onClick={() => onDelete(id)}
                  accessibilityLabel={`Delete ${name}`}
                />
              </Tooltip>
            </div>
          </div>

          {/* Row 2: Rule summary */}
          <div style={{ marginTop: "4px" }}>
            <Text as="span" variant="bodySm" tone="subdued">
              {getRuleSummary(rule)}
            </Text>
          </div>

          {/* Row 3: Error message */}
          <div style={{ marginTop: "6px", color: "#6d7175", fontSize: "13px" }}>
            → "{error_message}"
          </div>
        </div>
      </div>
    </ResourceItem>
  );
}

