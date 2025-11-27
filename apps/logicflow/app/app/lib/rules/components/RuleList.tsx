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
  EmptyState,
  Box,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon, ViewIcon, HideIcon } from "@shopify/polaris-icons";
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

export function RuleList({
  rules,
  onEdit,
  onToggle,
  onDelete,
  onAddRule,
  onClearAll,
}: RuleListProps) {
  if (rules.length === 0) {
    return (
      <Card>
        <EmptyState
          heading="Create your first validation rule"
          action={{
            content: "Add Rule",
            onAction: onAddRule,
          }}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>
            Validation rules let you control what can and cannot be checked out.
            Block orders by cart total, shipping location, and more.
          </p>
        </EmptyState>
      </Card>
    );
  }

  return (
    <>
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

      <Box paddingBlockStart="400">
        <InlineStack align="end">
          <Button tone="critical" variant="plain" onClick={onClearAll}>
            Clear All Rules
          </Button>
        </InlineStack>
      </Box>
    </>
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
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
          <InlineStack gap="200" blockAlign="center">
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              {name}
            </Text>
            <Badge tone={enabled ? "success" : undefined}>
              {enabled ? "Active" : "Disabled"}
            </Badge>
            <Badge tone="info">{`${complexity} pts`}</Badge>
          </InlineStack>
          <Text as="span" variant="bodySm" tone="subdued">
            {getRuleSummary(rule)}
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            Error: "{error_message}"
          </Text>
        </BlockStack>
        <InlineStack gap="300" blockAlign="center">
          <div onClick={(e) => e.stopPropagation()}>
            <Tooltip content={enabled ? "Disable rule" : "Enable rule"}>
              <Button
                icon={enabled ? HideIcon : ViewIcon}
                variant="plain"
                onClick={() => onToggle(id)}
                accessibilityLabel={enabled ? `Disable ${name}` : `Enable ${name}`}
              />
            </Tooltip>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Tooltip content="Edit rule">
              <Button
                icon={EditIcon}
                variant="plain"
                onClick={() => onEdit(rule)}
                accessibilityLabel={`Edit ${name}`}
              />
            </Tooltip>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
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
        </InlineStack>
      </InlineStack>
    </ResourceItem>
  );
}

