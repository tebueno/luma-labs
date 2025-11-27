import {
  BlockStack,
  InlineStack,
  Button,
  Text,
  Box,
  ButtonGroup,
} from "@shopify/polaris";
import { PlusIcon } from "@shopify/polaris-icons";
import {
  ConditionRow,
  createDefaultCondition,
  type ConditionFormData,
} from "./ConditionRow";

type LogicalOperator = "AND" | "OR";

interface ConditionBuilderProps {
  conditions: ConditionFormData[];
  logicalOperator: LogicalOperator;
  onConditionsChange: (conditions: ConditionFormData[]) => void;
  onLogicalOperatorChange: (operator: LogicalOperator) => void;
}

export function ConditionBuilder({
  conditions,
  logicalOperator,
  onConditionsChange,
  onLogicalOperatorChange,
}: ConditionBuilderProps) {
  const handleConditionChange = (
    id: string,
    updates: Partial<ConditionFormData>
  ) => {
    const updated = conditions.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    onConditionsChange(updated);
  };

  const handleRemoveCondition = (id: string) => {
    if (conditions.length <= 1) return;
    onConditionsChange(conditions.filter((c) => c.id !== id));
  };

  const handleAddCondition = () => {
    onConditionsChange([...conditions, createDefaultCondition()]);
  };

  return (
    <BlockStack gap="300">
      <Text as="h3" variant="headingSm">
        Conditions
      </Text>

      <BlockStack gap="200">
        {conditions.map((condition, index) => (
          <BlockStack gap="200" key={condition.id}>
            <ConditionRow
              condition={condition}
              onChange={handleConditionChange}
              onRemove={handleRemoveCondition}
              canRemove={conditions.length > 1}
            />

            {/* Show logical operator between conditions */}
            {index < conditions.length - 1 && (
              <Box paddingInlineStart="400">
                <InlineStack gap="200" blockAlign="center">
                  <Box
                    borderColor="border"
                    borderWidth="025"
                    borderBlockEndWidth="0"
                    minWidth="20px"
                  />
                  <ButtonGroup variant="segmented">
                    <Button
                      pressed={logicalOperator === "AND"}
                      onClick={() => onLogicalOperatorChange("AND")}
                      size="slim"
                    >
                      AND
                    </Button>
                    <Button
                      pressed={logicalOperator === "OR"}
                      onClick={() => onLogicalOperatorChange("OR")}
                      size="slim"
                    >
                      OR
                    </Button>
                  </ButtonGroup>
                  <Box
                    borderColor="border"
                    borderWidth="025"
                    borderBlockEndWidth="0"
                    minWidth="20px"
                  />
                </InlineStack>
              </Box>
            )}
          </BlockStack>
        ))}
      </BlockStack>

      <Button icon={PlusIcon} onClick={handleAddCondition} variant="plain">
        Add condition
      </Button>

      {conditions.length > 1 && (
        <Box
          padding="200"
          background="bg-surface-info"
          borderRadius="100"
        >
          <Text as="p" variant="bodySm" tone="subdued">
            {logicalOperator === "AND"
              ? "All conditions must match to block checkout"
              : "Any condition matching will block checkout"}
          </Text>
        </Box>
      )}
    </BlockStack>
  );
}

