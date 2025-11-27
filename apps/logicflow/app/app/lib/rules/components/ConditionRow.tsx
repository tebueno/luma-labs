import { InlineStack, Select, TextField, Button, Box } from "@shopify/polaris";
import { DeleteIcon } from "@shopify/polaris-icons";
import { FIELD_OPTIONS, OPERATOR_OPTIONS } from "../constants";
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
  const isNumericField =
    condition.field.includes("total") ||
    condition.field.includes("quantity") ||
    condition.field.includes("weight");

  return (
    <Box
      padding="300"
      background="bg-surface-secondary"
      borderRadius="200"
    >
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
        <Box minWidth="100px">
          <TextField
            label="Value"
            labelHidden
            value={condition.value}
            onChange={(value) => onChange(condition.id, { value })}
            autoComplete="off"
            placeholder={isNumericField ? "100" : "value"}
          />
        </Box>
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

