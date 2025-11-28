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
import { useState, useCallback, useMemo, useEffect } from "react";
import {
  FIELD_OPTIONS,
  OPERATOR_OPTIONS,
  FIELD_TYPES,
  OPERATORS_BY_FIELD_TYPE,
  DEFAULT_OPERATOR_BY_TYPE,
  VALUE_PLACEHOLDERS,
  UNARY_OPERATORS,
  type FieldType,
} from "../constants";
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
  const [previousFieldType, setPreviousFieldType] = useState<FieldType | null>(
    null
  );

  // Get field type for current field
  const fieldType: FieldType = FIELD_TYPES[condition.field] || "string";
  const isNumericField = fieldType === "numeric";
  const isCustomerTagsField = condition.field === "customer.tags";
  const isUnaryOperator = UNARY_OPERATORS.includes(
    condition.operator as (typeof UNARY_OPERATORS)[number]
  );

  // Get valid operators for current field type
  const validOperators = useMemo(() => {
    const allowedOperatorValues = OPERATORS_BY_FIELD_TYPE[fieldType];
    return OPERATOR_OPTIONS.filter((op) =>
      allowedOperatorValues.includes(op.value)
    );
  }, [fieldType]);

  // Reset operator when field type changes
  useEffect(() => {
    if (previousFieldType !== null && previousFieldType !== fieldType) {
      // Check if current operator is valid for new field type
      const allowedOperators = OPERATORS_BY_FIELD_TYPE[fieldType];
      if (!allowedOperators.includes(condition.operator)) {
        // Reset to default operator for new field type
        const newOperator = DEFAULT_OPERATOR_BY_TYPE[fieldType];
        onChange(condition.id, { operator: newOperator, value: "" });
      }
    }
    setPreviousFieldType(fieldType);
  }, [fieldType, previousFieldType, condition.operator, condition.id, onChange]);

  // Sync tag input value with condition value
  useEffect(() => {
    if (isCustomerTagsField) {
      setTagInputValue(condition.value);
    }
  }, [isCustomerTagsField, condition.value]);

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

  const handleFieldChange = useCallback(
    (newField: string) => {
      const newFieldType = FIELD_TYPES[newField] || "string";
      const currentFieldType = FIELD_TYPES[condition.field] || "string";

      // If field type changes, reset operator and value
      if (newFieldType !== currentFieldType) {
        const newOperator = DEFAULT_OPERATOR_BY_TYPE[newFieldType];
        onChange(condition.id, {
          field: newField,
          operator: newOperator,
          value: "",
        });
      } else {
        onChange(condition.id, { field: newField });
      }
    },
    [condition.id, condition.field, onChange]
  );

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

  // Get contextual placeholder for value input
  const getPlaceholder = (): string => {
    return VALUE_PLACEHOLDERS[condition.field] || "value";
  };

  // Render value input based on field type
  const renderValueInput = () => {
    // Unary operators (IS_PO_BOX, IS_NOT_PO_BOX) don't need a value
    if (isUnaryOperator) {
      return (
        <Box minWidth="120px">
          <Text as="span" variant="bodySm" tone="subdued">
            No value needed
          </Text>
        </Box>
      );
    }

    // Customer tags field - show combobox with suggestions
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
                placeholder={getPlaceholder()}
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

    // Numeric fields - show number input
    if (isNumericField) {
      return (
        <TextField
          label="Value"
          labelHidden
          type="number"
          value={condition.value}
          onChange={(value) => onChange(condition.id, { value })}
          autoComplete="off"
          placeholder={getPlaceholder()}
          prefix={condition.field === "cart.total" ? "$" : undefined}
          min={0}
        />
      );
    }

    // String/code/address fields - show text input
    return (
      <TextField
        label="Value"
        labelHidden
        value={condition.value}
        onChange={(value) => onChange(condition.id, { value })}
        autoComplete="off"
        placeholder={getPlaceholder()}
      />
    );
  };

  return (
    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
      <InlineStack gap="200" align="start" blockAlign="start" wrap={false}>
        <Box minWidth="180px">
          <Select
            label="Field"
            labelHidden
            options={[...FIELD_OPTIONS]}
            value={condition.field}
            onChange={handleFieldChange}
          />
        </Box>
        <Box minWidth="160px">
          <Select
            label="Operator"
            labelHidden
            options={validOperators}
            value={condition.operator}
            onChange={(value) => onChange(condition.id, { operator: value })}
          />
        </Box>
        <Box minWidth="140px">{renderValueInput()}</Box>
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

