import { useMemo } from "react";
import {
  Modal,
  BlockStack,
  TextField,
  Checkbox,
  Box,
  InlineStack,
  Text,
  Badge,
  Icon,
  Divider,
} from "@shopify/polaris";
import {
  XCircleIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "@shopify/polaris-icons";
import type { Rule, RuleFormState, ConditionFormData } from "../types";
import { ConditionBuilder } from "./ConditionBuilder";
import { getFieldLabel, getOperatorLabel } from "../utils";
import { UNARY_OPERATORS } from "../constants";

interface RuleModalProps {
  open: boolean;
  editingRule: Rule | null;
  formState: RuleFormState;
  onNameChange: (value: string) => void;
  onConditionsChange: (conditions: ConditionFormData[]) => void;
  onLogicalOperatorChange: (operator: "AND" | "OR") => void;
  onErrorMessageChange: (value: string) => void;
  onEnabledChange: (value: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

// ============================================================================
// Live Preview Component
// ============================================================================

interface LivePreviewProps {
  name: string;
  conditions: ConditionFormData[];
  logicalOperator: "AND" | "OR";
  errorMessage: string;
  enabled: boolean;
}

function LivePreview({
  name,
  conditions,
  logicalOperator,
  errorMessage,
  enabled,
}: LivePreviewProps) {
  const complexity = conditions.length;
  
  // Generate human-readable condition summary
  const conditionSummary = useMemo(() => {
    if (conditions.length === 0) return "No conditions set";
    
    const summaries = conditions.map((c) => {
      const field = getFieldLabel(c.field);
      const operator = getOperatorLabel(c.operator).toLowerCase();
      const isUnary = UNARY_OPERATORS.includes(
        c.operator as (typeof UNARY_OPERATORS)[number]
      );
      if (isUnary) {
        return `${field} ${operator}`;
      }
      return `${field} ${operator} "${c.value || "?"}"`;
    });
    
    if (summaries.length === 1) {
      return summaries[0];
    }
    
    const joiner = logicalOperator === "AND" ? " AND " : " OR ";
    return summaries.join(joiner);
  }, [conditions, logicalOperator]);

  const isValid = name.trim() && conditions.every((c) => {
    const isUnary = UNARY_OPERATORS.includes(
      c.operator as (typeof UNARY_OPERATORS)[number]
    );
    return c.field && c.operator && (isUnary || c.value);
  });

  return (
    <Box
      padding="400"
      background="bg-surface-secondary"
      borderRadius="200"
      borderColor="border"
      borderWidth="025"
    >
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingSm">
            Rule Preview
          </Text>
          <InlineStack gap="200">
            <Badge tone={enabled ? "success" : undefined}>
              {enabled ? "Active" : "Disabled"}
            </Badge>
            <Badge tone="info">{complexity} pt{complexity !== 1 ? "s" : ""}</Badge>
          </InlineStack>
        </InlineStack>

        <Divider />

        {/* Rule name */}
        <InlineStack gap="200" blockAlign="center">
          <Text as="span" variant="bodySm" tone="subdued">
            Name:
          </Text>
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            {name || "Untitled Rule"}
          </Text>
        </InlineStack>

        {/* Condition summary */}
        <Box padding="200" background="bg-surface" borderRadius="100">
          <BlockStack gap="100">
            <Text as="span" variant="bodySm" tone="subdued">
              Block checkout when:
            </Text>
            <Text as="span" variant="bodySm">
              {conditionSummary}
            </Text>
          </BlockStack>
        </Box>

        {/* Error message preview */}
        <InlineStack gap="200" blockAlign="start" wrap={false}>
          <Box paddingBlockStart="050">
            <Icon source={XCircleIcon} tone="critical" />
          </Box>
          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">
              Customer will see:
            </Text>
            <Text as="span" variant="bodySm" fontWeight="medium">
              "{errorMessage || "No message set"}"
            </Text>
          </BlockStack>
        </InlineStack>

        {/* Validation status */}
        {!isValid && (
          <InlineStack gap="200" blockAlign="center">
            <Icon source={AlertTriangleIcon} tone="warning" />
            <Text as="span" variant="bodySm" tone="caution">
              Fill in all fields to save this rule
            </Text>
          </InlineStack>
        )}
      </BlockStack>
    </Box>
  );
}

// ============================================================================
// Main Modal Component
// ============================================================================

export function RuleModal({
  open,
  editingRule,
  formState,
  onNameChange,
  onConditionsChange,
  onLogicalOperatorChange,
  onErrorMessageChange,
  onEnabledChange,
  onSave,
  onClose,
}: RuleModalProps) {
  const isValid = useMemo(() => {
    return (
      formState.name.trim() &&
      formState.conditions.every((c) => {
        const isUnary = UNARY_OPERATORS.includes(
          c.operator as (typeof UNARY_OPERATORS)[number]
        );
        return c.field && c.operator && (isUnary || c.value);
      })
    );
  }, [formState]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingRule ? "Edit Rule" : "Create New Rule"}
      primaryAction={{
        content: editingRule ? "Save Changes" : "Create Rule",
        onAction: onSave,
        disabled: !isValid,
      }}
      secondaryActions={[
        {
          content: "Cancel",
          onAction: onClose,
        },
      ]}
      size="large"
    >
      <Modal.Section>
        <BlockStack gap="600">
          {/* Section 1: Rule Identity */}
          <BlockStack gap="400">
            <BlockStack gap="100">
              <Text as="h3" variant="headingSm">
                Rule Details
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Give your rule a descriptive name to identify it later
              </Text>
            </BlockStack>
            
            <TextField
              label="Rule Name"
              value={formState.name}
              onChange={onNameChange}
              autoComplete="off"
              placeholder="e.g., Block orders over $500, Restrict PO Box shipping"
            />
          </BlockStack>

          <Divider />

          {/* Section 2: Conditions */}
          <ConditionBuilder
            conditions={formState.conditions}
            logicalOperator={formState.logicalOperator}
            onConditionsChange={onConditionsChange}
            onLogicalOperatorChange={onLogicalOperatorChange}
          />

          <Divider />

          {/* Section 3: Error Message */}
          <BlockStack gap="400">
            <BlockStack gap="100">
              <Text as="h3" variant="headingSm">
                Customer Message
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                This message appears at checkout when the rule blocks an order
              </Text>
            </BlockStack>
            
            <TextField
              label="Error Message"
              labelHidden
              value={formState.errorMessage}
              onChange={onErrorMessageChange}
              autoComplete="off"
              multiline={2}
              placeholder="e.g., Sorry, we cannot process orders over $500. Please contact sales for wholesale orders."
            />
          </BlockStack>

          <Divider />

          {/* Section 4: Status & Preview */}
          <BlockStack gap="400">
            <Checkbox
              label={
                <InlineStack gap="200" blockAlign="center">
                  <Text as="span" variant="bodyMd">
                    Enable this rule
                  </Text>
                  {formState.enabled ? (
                    <Badge tone="success">
                      <InlineStack gap="100" blockAlign="center">
                        <Icon source={CheckCircleIcon} />
                        <span>Will block checkout</span>
                      </InlineStack>
                    </Badge>
                  ) : (
                    <Badge>Disabled - won't affect checkout</Badge>
                  )}
                </InlineStack>
              }
              checked={formState.enabled}
              onChange={onEnabledChange}
            />

            {/* Live Preview */}
            <LivePreview
              name={formState.name}
              conditions={formState.conditions}
              logicalOperator={formState.logicalOperator}
              errorMessage={formState.errorMessage}
              enabled={formState.enabled}
            />
          </BlockStack>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
