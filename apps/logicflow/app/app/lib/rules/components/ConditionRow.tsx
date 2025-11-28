import {
  InlineStack,
  Select,
  TextField,
  Button,
  Box,
  Combobox,
  Listbox,
  Icon,
  Text,
  BlockStack,
} from "@shopify/polaris";
import { DeleteIcon, AlertTriangleIcon } from "@shopify/polaris-icons";
import { useState, useCallback, useMemo } from "react";
import { FIELD_OPTIONS, OPERATOR_OPTIONS } from "../constants";
import { SUPPORTED_CUSTOMER_TAGS } from "../evaluator";
import type { ConditionFormData } from "../types";

export type { ConditionFormData } from "../types";

interface ConditionRowProps {
  condition: ConditionFormData;
  onChange: (id: string, updates: Partial<ConditionFormData>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export function ConditionRow({
  condition,
  onChange,
  onRemove,
  canRemove,
}: ConditionRowProps) {
  const [tagInputValue, setTagInputValue] = useState(condition.value);

  const isNumericField =
    condition.field.includes("total") ||
    condition.field.includes("quantity") ||
    condition.field.includes("weight");

  const isCustomerTagsField = condition.field === "customer.tags";

  // Filter tag suggestions based on input
  const filteredTags = useMemo(() => {
    if (!tagInputValue) return [...SUPPORTED_CUSTOMER_TAGS];
    const lowerInput = tagInputValue.toLowerCase();
    return SUPPORTED_CUSTOMER_TAGS.filter((tag) =>
      tag.toLowerCase().includes(lowerInput)
    );
  }, [tagInputValue]);

  // Check if current tag value is supported
  const isUnsupportedTag = useMemo(() => {
    if (!isCustomerTagsField || !condition.value) return false;
    return !SUPPORTED_CUSTOMER_TAGS.includes(
      condition.value.toLowerCase() as (typeof SUPPORTED_CUSTOMER_TAGS)[number]
    );
  }, [isCustomerTagsField, condition.value]);

  const handleTagSelect = useCallback(
    (selectedTag: string) => {
      onChange(condition.id, { value: selectedTag });
      setTagInputValue(selectedTag);
    },
    [condition.id, onChange]
  );

  const handleTagInputChange = useCallback(
    (value: string) => {
      setTagInputValue(value);
      onChange(condition.id, { value });
    },
    [condition.id, onChange]
  );

  // Render value input based on field type
  const renderValueInput = () => {
    if (isCustomerTagsField) {
      return (
        <BlockStack gap="100">
          <Combobox
            activator={
              <Combobox.TextField
                label="Tag"
                labelHidden
                value={tagInputValue}
                onChange={handleTagInputChange}
                placeholder="e.g., vip"
                autoComplete="off"
              />
            }
          >
            {filteredTags.length > 0 && (
              <Listbox onSelect={handleTagSelect}>
                {filteredTags.map((tag) => (
                  <Listbox.Option key={tag} value={tag}>
                    {tag}
                  </Listbox.Option>
                ))}
              </Listbox>
            )}
          </Combobox>
          {isUnsupportedTag && (
            <InlineStack gap="100" blockAlign="center">
              <Icon source={AlertTriangleIcon} tone="warning" />
              <Text as="span" variant="bodySm" tone="caution">
                Tag not in supported list
              </Text>
            </InlineStack>
          )}
        </BlockStack>
      );
    }

    return (
      <TextField
        label="Value"
        labelHidden
        value={condition.value}
        onChange={(value) => onChange(condition.id, { value })}
        autoComplete="off"
        placeholder={isNumericField ? "100" : "value"}
      />
    );
  };

  return (
    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
      <InlineStack gap="200" align="start" blockAlign="start" wrap={false}>
        <Box minWidth="160px">
          <Select
            label="Field"
            labelHidden
            options={[...FIELD_OPTIONS]}
            value={condition.field}
            onChange={(value) => onChange(condition.id, { field: value })}
          />
        </Box>
        <Box minWidth="140px">
          <Select
            label="Operator"
            labelHidden
            options={[...OPERATOR_OPTIONS]}
            value={condition.operator}
            onChange={(value) => onChange(condition.id, { operator: value })}
          />
        </Box>
        <Box minWidth="120px">{renderValueInput()}</Box>
        {canRemove && (
          <Button
            icon={DeleteIcon}
            variant="plain"
            tone="critical"
            onClick={() => onRemove(condition.id)}
            accessibilityLabel="Remove condition"
          />
        )}
      </InlineStack>
    </Box>
  );
}

// Re-export createDefaultCondition from types
export { createDefaultCondition } from "../types";

