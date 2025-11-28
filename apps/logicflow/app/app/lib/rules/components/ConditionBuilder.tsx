import {
  BlockStack,
  InlineStack,
  Button,
  Text,
  Box,
  Badge,
  Icon,
} from "@shopify/polaris";
import { PlusIcon, AlertCircleIcon } from "@shopify/polaris-icons";
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

// ============================================================================
// Logical Operator Toggle Component
// ============================================================================

interface LogicalOperatorToggleProps {
  value: LogicalOperator;
  onChange: (operator: LogicalOperator) => void;
}

function LogicalOperatorToggle({ value, onChange }: LogicalOperatorToggleProps) {
  return (
    <Box paddingBlock="100">
      <InlineStack gap="200" blockAlign="center">
        {/* Left connector line */}
        <Box
          background="bg-fill-tertiary"
          minWidth="40px"
          minHeight="2px"
          borderRadius="100"
        />
        
        {/* Toggle buttons */}
        <InlineStack gap="0">
          <button
            type="button"
            onClick={() => onChange("AND")}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 600,
              border: "none",
              borderRadius: "6px 0 0 6px",
              cursor: "pointer",
              transition: "all 0.15s ease",
              backgroundColor: value === "AND" ? "#5c6ac4" : "#f1f2f4",
              color: value === "AND" ? "white" : "#6d7175",
            }}
          >
            AND
          </button>
          <button
            type="button"
            onClick={() => onChange("OR")}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 600,
              border: "none",
              borderRadius: "0 6px 6px 0",
              cursor: "pointer",
              transition: "all 0.15s ease",
              backgroundColor: value === "OR" ? "#5c6ac4" : "#f1f2f4",
              color: value === "OR" ? "white" : "#6d7175",
            }}
          >
            OR
          </button>
        </InlineStack>
        
        {/* Right connector line */}
        <Box
          background="bg-fill-tertiary"
          minWidth="40px"
          minHeight="2px"
          borderRadius="100"
        />
      </InlineStack>
    </Box>
  );
}

// ============================================================================
// Logic Explanation Banner
// ============================================================================

interface LogicExplanationProps {
  operator: LogicalOperator;
  conditionCount: number;
}

function LogicExplanation({ operator, conditionCount }: LogicExplanationProps) {
  if (conditionCount <= 1) return null;
  
  const isAnd = operator === "AND";
  
  return (
    <Box
      padding="300"
      background={isAnd ? "bg-surface-warning" : "bg-surface-info"}
      borderRadius="200"
    >
      <InlineStack gap="200" blockAlign="center" wrap={false}>
        <Icon source={AlertCircleIcon} tone={isAnd ? "caution" : "info"} />
        <BlockStack gap="050">
          <Text as="span" variant="bodySm" fontWeight="semibold">
            {isAnd ? "Strict matching (AND)" : "Flexible matching (OR)"}
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            {isAnd
              ? `All ${conditionCount} conditions must be true to block checkout`
              : `Any 1 of ${conditionCount} conditions will block checkout`}
          </Text>
        </BlockStack>
      </InlineStack>
    </Box>
  );
}

// ============================================================================
// Main Condition Builder
// ============================================================================

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
    <BlockStack gap="400">
      {/* Header */}
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingSm">
          When these conditions are met
        </Text>
        <Badge tone="info">{conditions.length} condition{conditions.length !== 1 ? "s" : ""}</Badge>
      </InlineStack>

      {/* Condition Cards with Visual Flow */}
      <Box
        padding="400"
        background="bg-surface-secondary"
        borderRadius="300"
        borderColor="border"
        borderWidth="025"
      >
        <BlockStack gap="0">
          {conditions.map((condition, index) => (
            <BlockStack gap="0" key={condition.id}>
              {/* Condition Row */}
              <ConditionRow
                condition={condition}
                onChange={handleConditionChange}
                onRemove={handleRemoveCondition}
                canRemove={conditions.length > 1}
                showIndex={conditions.length > 1}
                index={index + 1}
              />

              {/* Logical Operator Toggle between conditions */}
              {index < conditions.length - 1 && (
                <LogicalOperatorToggle
                  value={logicalOperator}
                  onChange={onLogicalOperatorChange}
                />
              )}
            </BlockStack>
          ))}
        </BlockStack>

        {/* Add Condition Button */}
        <Box paddingBlockStart="300">
          <Button icon={PlusIcon} onClick={handleAddCondition} variant="plain">
            Add another condition
          </Button>
        </Box>
      </Box>

      {/* Logic Explanation */}
      <LogicExplanation
        operator={logicalOperator}
        conditionCount={conditions.length}
      />
    </BlockStack>
  );
}

